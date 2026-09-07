import { getApiClient } from './apiClient';

const ExpenseService = {
  list: (params?: object) =>
    getApiClient().get('/expenses', { params }).then((res) => res.data),

  search: (keyword: string, params?: object) =>
    getApiClient().get('/expenses/search', { params: { keyword, ...params } }).then((res) => res.data),

  get: (id: number) =>
    getApiClient().get(`/expenses/${id}`).then((res) => res.data),

  create: (payload: object) =>
    getApiClient().post('/expenses', payload).then((res) => res.data),

  update: (id: number, payload: object) =>
    getApiClient().put(`/expenses/${id}`, payload).then((res) => res.data),

  remove: (id: number) =>
    getApiClient().delete(`/expenses/${id}`).then((res) => res.data),
};

export default ExpenseService;
