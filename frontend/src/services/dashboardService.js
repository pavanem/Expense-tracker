import apiClient from './apiClient';

const DashboardService = {
  get: () => apiClient.get('/dashboard').then((res) => res.data),
};

export default DashboardService;
