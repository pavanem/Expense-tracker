import { getApiClient } from './apiClient';
import OfflineStorage, { STORAGE_KEYS } from './offline/offlineStorage';
import syncService from './offline/syncService';

const IncomeCategoryService = {
  async list(): Promise<any[]> {
    try {
      const res = await getApiClient().get('/income-categories');
      await OfflineStorage.set(STORAGE_KEYS.INCOME_CATEGORIES, res.data);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES);
        if (cached) return cached;
      }
      throw err;
    }
  },

  async create(payload: object): Promise<any> {
    try {
      const res = await getApiClient().post('/income-categories', payload);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
      await OfflineStorage.set(STORAGE_KEYS.INCOME_CATEGORIES, [...cached, res.data]);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const tempId = -Date.now();
        const optimistic = { id: tempId, ...payload, active: true, _isPendingSync: true };
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
        await OfflineStorage.set(STORAGE_KEYS.INCOME_CATEGORIES, [...cached, optimistic]);
        await OfflineStorage.enqueueSyncAction({
          type: 'CREATE_INCOME_CAT',
          payload,
          tempId,
        });
        await syncService.refreshPendingCount();
        return optimistic;
      }
      throw err;
    }
  },

  async update(id: number, payload: object): Promise<any> {
    try {
      const res = await getApiClient().put(`/income-categories/${id}`, payload);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.INCOME_CATEGORIES,
        cached.map((c) => (c.id === id ? res.data : c))
      );
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
        const optimistic = { id, ...payload };
        await OfflineStorage.set(
          STORAGE_KEYS.INCOME_CATEGORIES,
          cached.map((c) => (c.id === id ? { ...c, ...payload } : c))
        );
        await OfflineStorage.enqueueSyncAction({
          type: 'UPDATE_INCOME_CAT',
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
      const res = await getApiClient().delete(`/income-categories/${id}`);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.INCOME_CATEGORIES,
        cached.filter((c) => c.id !== id)
      );
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.INCOME_CATEGORIES)) || [];
        await OfflineStorage.set(
          STORAGE_KEYS.INCOME_CATEGORIES,
          cached.filter((c) => c.id !== id)
        );
        await OfflineStorage.enqueueSyncAction({
          type: 'DELETE_INCOME_CAT',
          targetId: id,
        });
        await syncService.refreshPendingCount();
        return { success: true };
      }
      throw err;
    }
  },
};

export default IncomeCategoryService;
