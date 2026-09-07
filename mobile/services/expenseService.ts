import { getApiClient } from './apiClient';
import OfflineStorage, { STORAGE_KEYS } from './offline/offlineStorage';
import syncService from './offline/syncService';

const ExpenseService = {
  async list(params?: any): Promise<any> {
    try {
      const res = await getApiClient().get('/expenses', { params });
      syncService.setOnlineStatus(true);
      const items = res.data.content ?? res.data;
      if (Array.isArray(items) && (!params?.page || params.page === 0) && !params?.keyword) {
        // Save first page / recent items to cache
        await OfflineStorage.set(STORAGE_KEYS.EXPENSES, items);
      }
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
        let filtered = cached;
        if (params?.keyword) {
          const q = params.keyword.toLowerCase();
          filtered = cached.filter(
            (e) =>
              (e.merchant && e.merchant.toLowerCase().includes(q)) ||
              (e.description && e.description.toLowerCase().includes(q)) ||
              (e.categoryName && e.categoryName.toLowerCase().includes(q))
          );
        }
        return {
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          last: true,
          first: true,
          size: filtered.length,
          number: 0,
        };
      }
      throw err;
    }
  },

  async search(keyword: string, params?: object): Promise<any> {
    try {
      const res = await getApiClient().get('/expenses/search', {
        params: { keyword, ...params },
      });
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        return this.list({ keyword, ...params });
      }
      throw err;
    }
  },

  async get(id: number): Promise<any> {
    try {
      const res = await getApiClient().get(`/expenses/${id}`);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
        const found = cached.find((e) => e.id === id);
        if (found) return found;
      }
      throw err;
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const res = await getApiClient().post('/expenses', payload);
      syncService.setOnlineStatus(true);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
      await OfflineStorage.set(STORAGE_KEYS.EXPENSES, [res.data, ...cached]);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const tempId = -Date.now();
        // Resolve category name from cached categories if possible for immediate UI display
        const categories = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
        const cat = categories.find((c) => c.id === payload.categoryId);
        const optimistic = {
          id: tempId,
          ...payload,
          categoryName: cat?.name || 'Uncategorized',
          date: payload.date || new Date().toISOString().split('T')[0],
          _isPendingSync: true,
        };
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
        await OfflineStorage.set(STORAGE_KEYS.EXPENSES, [optimistic, ...cached]);
        await OfflineStorage.enqueueSyncAction({
          type: 'CREATE_EXPENSE',
          payload,
          tempId,
        });
        await syncService.refreshPendingCount();
        return optimistic;
      }
      throw err;
    }
  },

  async update(id: number, payload: any): Promise<any> {
    try {
      const res = await getApiClient().put(`/expenses/${id}`, payload);
      syncService.setOnlineStatus(true);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.EXPENSES,
        cached.map((e) => (e.id === id ? res.data : e))
      );
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
        const optimistic = { id, ...payload, _isPendingSync: true };
        await OfflineStorage.set(
          STORAGE_KEYS.EXPENSES,
          cached.map((e) => (e.id === id ? { ...e, ...payload, _isPendingSync: true } : e))
        );
        await OfflineStorage.enqueueSyncAction({
          type: 'UPDATE_EXPENSE',
          targetId: id,
          payload,
        });
        await syncService.refreshPendingCount();
        return optimistic;
      }
      throw err;
    }
  },

  async remove(id: number): Promise<any> {
    try {
      const res = await getApiClient().delete(`/expenses/${id}`);
      syncService.setOnlineStatus(true);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.EXPENSES,
        cached.filter((e) => e.id !== id)
      );
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.EXPENSES)) || [];
        await OfflineStorage.set(
          STORAGE_KEYS.EXPENSES,
          cached.filter((e) => e.id !== id)
        );
        // If it was a tempId created offline, cancel its create action
        if (id < 0) {
          const queue = await OfflineStorage.getSyncQueue();
          const match = queue.find((q) => q.tempId === id);
          if (match) {
            await OfflineStorage.removeSyncAction(match.id);
            await syncService.refreshPendingCount();
            return { success: true };
          }
        }
        await OfflineStorage.enqueueSyncAction({
          type: 'DELETE_EXPENSE',
          targetId: id,
        });
        await syncService.refreshPendingCount();
        return { success: true };
      }
      throw err;
    }
  },
};

export default ExpenseService;
