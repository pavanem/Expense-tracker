import { getApiClient } from './apiClient';
import OfflineStorage, { STORAGE_KEYS } from './offline/offlineStorage';
import syncService from './offline/syncService';

const CategoryService = {
  async list(): Promise<any[]> {
    try {
      const res = await getApiClient().get('/categories');
      await OfflineStorage.set(STORAGE_KEYS.CATEGORIES, res.data);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES);
        if (cached) return cached;
      }
      throw err;
    }
  },

  async create(payload: object): Promise<any> {
    try {
      const res = await getApiClient().post('/categories', payload);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
      await OfflineStorage.set(STORAGE_KEYS.CATEGORIES, [...cached, res.data]);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const tempId = -Date.now();
        const optimistic = { id: tempId, ...payload, active: true, _isPendingSync: true };
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
        await OfflineStorage.set(STORAGE_KEYS.CATEGORIES, [...cached, optimistic]);
        await OfflineStorage.enqueueSyncAction({
          type: 'CREATE_CATEGORY',
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
      const res = await getApiClient().put(`/categories/${id}`, payload);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.CATEGORIES,
        cached.map((c) => (c.id === id ? res.data : c))
      );
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
        const optimistic = { id, ...payload };
        await OfflineStorage.set(
          STORAGE_KEYS.CATEGORIES,
          cached.map((c) => (c.id === id ? { ...c, ...payload } : c))
        );
        await OfflineStorage.enqueueSyncAction({
          type: 'UPDATE_CATEGORY',
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
      const res = await getApiClient().delete(`/categories/${id}`);
      const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
      await OfflineStorage.set(
        STORAGE_KEYS.CATEGORIES,
        cached.filter((c) => c.id !== id)
      );
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = (await OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES)) || [];
        await OfflineStorage.set(
          STORAGE_KEYS.CATEGORIES,
          cached.filter((c) => c.id !== id)
        );
        await OfflineStorage.enqueueSyncAction({
          type: 'DELETE_CATEGORY',
          targetId: id,
        });
        await syncService.refreshPendingCount();
        return { success: true };
      }
      throw err;
    }
  },
};

export default CategoryService;
