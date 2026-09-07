import { getApiClient } from './apiClient';
import OfflineStorage, { STORAGE_KEYS } from './offline/offlineStorage';
import syncService from './offline/syncService';

const IncomeService = {
  async list(params?: any): Promise<any> {
    try {
      const res = await getApiClient().get('/incomes', { params });
      syncService.setOnlineStatus(true);
      const items = res.data.content ?? res.data;
      if (Array.isArray(items) && (!params?.page || params.page === 0) && !params?.keyword) {
        await OfflineStorage.set(STORAGE_KEYS.INCOMES, items);
      }
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
        let filtered = cached;
        if (params?.keyword) {
          const q = params.keyword.toLowerCase();
          filtered = cached.filter(
            (i) =>
              (i.source && i.source.toLowerCase().includes(q)) ||
              (i.description && i.description.toLowerCase().includes(q)) ||
              (i.categoryName && i.categoryName.toLowerCase().includes(q))
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
      const res = await getApiClient().get('/incomes/search', {
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
      const res = await getApiClient().get(`/incomes/${id}`);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
        const found = cached.find((i) => i.id === id);
        if (found) return found;
      }
      throw err;
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const res = await getApiClient().post('/incomes', payload);
      syncService.setOnlineStatus(true);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
      await OfflineStorage.set(STORAGE_KEYS.INCOMES, [res.data, ...cached]);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const tempId = -Date.now();
        const categories = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
        const cat = categories.find((c) => c.id === payload.categoryId);
        const optimistic = {
          id: tempId,
          ...payload,
          categoryName: cat?.name || 'Uncategorized',
          date: payload.date || new Date().toISOString().split('T')[0],
          _isPendingSync: true,
        };
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
        await OfflineStorage.set(STORAGE_KEYS.INCOMES, [optimistic, ...cached]);
        await OfflineStorage.enqueueSyncAction({
          type: 'CREATE_INCOME',
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
      const res = await getApiClient().put(`/incomes/${id}`, payload);
      syncService.setOnlineStatus(true);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.INCOMES,
        cached.map((i) => (i.id === id ? res.data : i))
      );
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
        const optimistic = { id, ...payload, _isPendingSync: true };
        await OfflineStorage.set(
          STORAGE_KEYS.INCOMES,
          cached.map((i) => (i.id === id ? { ...i, ...payload, _isPendingSync: true } : i))
        );
        await OfflineStorage.enqueueSyncAction({
          type: 'UPDATE_INCOME',
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
      const res = await getApiClient().delete(`/incomes/${id}`);
      syncService.setOnlineStatus(true);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.INCOMES,
        cached.filter((i) => i.id !== id)
      );
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOMES)) || [];
        await OfflineStorage.set(
          STORAGE_KEYS.INCOMES,
          cached.filter((i) => i.id !== id)
        );
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
          type: 'DELETE_INCOME',
          targetId: id,
        });
        await syncService.refreshPendingCount();
        return { success: true };
      }
      throw err;
    }
  },
};

export default IncomeService;
