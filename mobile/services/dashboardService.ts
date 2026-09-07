import { getApiClient } from './apiClient';

const DashboardService = {
  get: () => getApiClient().get('/dashboard').then((res) => res.data),
};

export default DashboardService;
