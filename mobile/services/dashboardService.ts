import { getApiClient } from './apiClient';
import OfflineStorage, { STORAGE_KEYS } from './offline/offlineStorage';
import syncService from './offline/syncService';

const DashboardService = {
  async get(): Promise<any> {
    try {
      const res = await getApiClient().get('/dashboard');
      await OfflineStorage.set(STORAGE_KEYS.DASHBOARD, res.data);
      syncService.setOnlineStatus(true);
      return res.data;
    } catch (err: any) {
      if (!err?.response?.status) {
        syncService.setOnlineStatus(false);
        const cached = await OfflineStorage.get<any>(STORAGE_KEYS.DASHBOARD);
        if (cached) return cached;
      }
      throw err;
    }
  },
};

export default DashboardService;
