import { getApiClient } from '../apiClient';
import OfflineStorage, { STORAGE_KEYS, SyncQueueItem } from './offlineStorage';

type SyncListener = (state: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}) => void;

class SyncService {
  private isOnline = true;
  private isSyncing = false;
  private pendingCount = 0;
  private listeners = new Set<SyncListener>();
  private intervalTimer: any = null;

  constructor() {
    this.refreshPendingCount();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (err) {
        console.warn('[SyncService] Listener error:', err);
      }
    });
  }

  public async refreshPendingCount(): Promise<number> {
    const queue = await OfflineStorage.getSyncQueue();
    this.pendingCount = queue.length;
    this.notify();
    return this.pendingCount;
  }

  public setOnlineStatus(online: boolean) {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.notify();
    }
  }

  /**
   * Fast probe to verify if Tailscale / server is reachable.
   * Uses a tight 2.5s timeout.
   */
  public async checkReachability(): Promise<boolean> {
    try {
      // /auth/registration-status is public and fast
      await getApiClient().get('/auth/registration-status', {
        timeout: 2500,
      });
      this.setOnlineStatus(true);
      return true;
    } catch (error: any) {
      // If server responded with ANY HTTP status (even 401/403/500), the network is reachable!
      if (error?.response?.status) {
        this.setOnlineStatus(true);
        return true;
      }
      // Connection timeout or network unreachable
      this.setOnlineStatus(false);
      return false;
    }
  }

  /**
   * Replays all queued offline actions against the backend in FIFO order.
   */
  public async syncQueue(): Promise<{ synced: number; pending: number; isOnline: boolean }> {
    if (this.isSyncing) {
      return { synced: 0, pending: this.pendingCount, isOnline: this.isOnline };
    }

    const reachable = await this.checkReachability();
    if (!reachable) {
      return { synced: 0, pending: this.pendingCount, isOnline: false };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    try {
      const queue = await OfflineStorage.getSyncQueue();
      const client = getApiClient();

      for (const item of queue) {
        try {
          await this.processQueueItem(item, client);
          await OfflineStorage.removeSyncAction(item.id);
          syncedCount++;
        } catch (itemErr: any) {
          console.warn(`[SyncService] Failed to sync action ${item.type}:`, itemErr?.message);
          // If network failed midway, stop processing queue
          if (!itemErr?.response?.status) {
            this.setOnlineStatus(false);
            break;
          }
          // Server returned validation error (4xx) - record error and increment retry count
          await OfflineStorage.updateSyncAction(item.id, {
            retryCount: item.retryCount + 1,
            lastError: itemErr?.response?.data?.message || itemErr?.message || 'Sync failed',
          });
        }
      }
    } finally {
      this.isSyncing = false;
      await this.refreshPendingCount();
    }

    return {
      synced: syncedCount,
      pending: this.pendingCount,
      isOnline: this.isOnline,
    };
  }

  private async processQueueItem(item: SyncQueueItem, client: any): Promise<void> {
    switch (item.type) {
      case 'CREATE_EXPENSE': {
        const res = await client.post('/expenses', item.payload);
        // Replace temp item in cached list
        if (item.tempId) {
          const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
          const updated = cached.map((e) => (e.id === item.tempId ? res.data : e));
          await OfflineStorage.set(STORAGE_KEYS.EXPENSES, updated);
        }
        break;
      }
      case 'UPDATE_EXPENSE': {
        await client.put(`/expenses/${item.targetId}`, item.payload);
        break;
      }
      case 'DELETE_EXPENSE': {
        await client.delete(`/expenses/${item.targetId}`);
        break;
      }
      case 'CREATE_INCOME': {
        const res = await client.post('/incomes', item.payload);
        if (item.tempId) {
          const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
          const updated = cached.map((i) => (i.id === item.tempId ? res.data : i));
          await OfflineStorage.set(STORAGE_KEYS.INCOMES, updated);
        }
        break;
      }
      case 'UPDATE_INCOME': {
        await client.put(`/incomes/${item.targetId}`, item.payload);
        break;
      }
      case 'DELETE_INCOME': {
        await client.delete(`/incomes/${item.targetId}`);
        break;
      }
      case 'CREATE_CATEGORY': {
        await client.post('/categories', item.payload);
        break;
      }
      case 'UPDATE_CATEGORY': {
        await client.put(`/categories/${item.targetId}`, item.payload);
        break;
      }
      case 'DELETE_CATEGORY': {
        await client.delete(`/categories/${item.targetId}`);
        break;
      }
      case 'CREATE_INCOME_CAT': {
        await client.post('/income-categories', item.payload);
        break;
      }
      case 'UPDATE_INCOME_CAT': {
        await client.put(`/income-categories/${item.targetId}`, item.payload);
        break;
      }
      case 'DELETE_INCOME_CAT': {
        await client.delete(`/income-categories/${item.targetId}`);
        break;
      }
    }
  }

  public startAutoSync(intervalMs = 25000) {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(async () => {
      const reachable = await this.checkReachability();
      if (reachable && this.pendingCount > 0) {
        await this.syncQueue();
      }
    }, intervalMs);
  }

  public stopAutoSync() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const syncService = new SyncService();
export default syncService;
