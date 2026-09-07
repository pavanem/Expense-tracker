import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  CATEGORIES: 'ET_CACHE_CATEGORIES',
  INCOME_CATEGORIES: 'ET_CACHE_INCOME_CATEGORIES',
  EXPENSES: 'ET_CACHE_EXPENSES',
  INCOMES: 'ET_CACHE_INCOMES',
  DASHBOARD: 'ET_CACHE_DASHBOARD',
  SYNC_QUEUE: 'ET_SYNC_QUEUE',
} as const;

export type SyncActionType =
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'CREATE_INCOME'
  | 'UPDATE_INCOME'
  | 'DELETE_INCOME'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'CREATE_INCOME_CAT'
  | 'UPDATE_INCOME_CAT'
  | 'DELETE_INCOME_CAT';

export interface SyncQueueItem {
  id: string;
  type: SyncActionType;
  payload?: any;
  targetId?: number;
  tempId?: number;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export const OfflineStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[OfflineStorage] Failed to read ${key}:`, e);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[OfflineStorage] Failed to write ${key}:`, e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`[OfflineStorage] Failed to remove ${key}:`, e);
    }
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const queue = await this.get<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE);
    return queue ?? [];
  },

  async enqueueSyncAction(
    action: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>
  ): Promise<SyncQueueItem> {
    const queue = await this.getSyncQueue();
    const newItem: SyncQueueItem = {
      ...action,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newItem);
    await this.set(STORAGE_KEYS.SYNC_QUEUE, queue);
    return newItem;
  },

  async removeSyncAction(actionId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const filtered = queue.filter((item) => item.id !== actionId);
    await this.set(STORAGE_KEYS.SYNC_QUEUE, filtered);
  },

  async updateSyncAction(actionId: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const queue = await this.getSyncQueue();
    const index = queue.findIndex((item) => item.id === actionId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await this.set(STORAGE_KEYS.SYNC_QUEUE, queue);
    }
  },

  async clearAllCaches(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CATEGORIES,
        STORAGE_KEYS.INCOME_CATEGORIES,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.INCOMES,
        STORAGE_KEYS.DASHBOARD,
        STORAGE_KEYS.SYNC_QUEUE,
      ]);
    } catch (e) {
      console.warn('[OfflineStorage] Failed to clear caches:', e);
    }
  },
};

export default OfflineStorage;
