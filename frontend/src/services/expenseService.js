import apiClient from './apiClient';

const ExpenseService = {
  list: (params) => apiClient.get('/expenses', { params }).then((res) => res.data),

  search: (keyword, params) =>
    apiClient.get('/expenses/search', { params: { keyword, ...params } }).then((res) => res.data),

  get: (id) => apiClient.get(`/expenses/${id}`).then((res) => res.data),

  create: (payload) => apiClient.post('/expenses', payload).then((res) => res.data),

  update: (id, payload) => apiClient.put(`/expenses/${id}`, payload).then((res) => res.data),

  remove: (id) => apiClient.delete(`/expenses/${id}`).then((res) => res.data),
};

export default ExpenseService;
