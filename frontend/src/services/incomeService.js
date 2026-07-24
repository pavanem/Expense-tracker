import apiClient from './apiClient';

const IncomeService = {
  list: (params) => apiClient.get('/incomes', { params }).then((res) => res.data),

  search: (keyword, params) =>
    apiClient.get('/incomes/search', { params: { keyword, ...params } }).then((res) => res.data),

  get: (id) => apiClient.get(`/incomes/${id}`).then((res) => res.data),

  create: (payload) => apiClient.post('/incomes', payload).then((res) => res.data),

  update: (id, payload) => apiClient.put(`/incomes/${id}`, payload).then((res) => res.data),

  remove: (id) => apiClient.delete(`/incomes/${id}`).then((res) => res.data),
};

export default IncomeService;
