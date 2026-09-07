import { getApiClient } from './apiClient';

const IncomeService = {
  list: (params?: object) =>
    getApiClient().get('/incomes', { params }).then((res) => res.data),

  search: (keyword: string, params?: object) =>
    getApiClient().get('/incomes/search', { params: { keyword, ...params } }).then((res) => res.data),

  get: (id: number) =>
    getApiClient().get(`/incomes/${id}`).then((res) => res.data),

  create: (payload: object) =>
    getApiClient().post('/incomes', payload).then((res) => res.data),

  update: (id: number, payload: object) =>
    getApiClient().put(`/incomes/${id}`, payload).then((res) => res.data),

  remove: (id: number) =>
    getApiClient().delete(`/incomes/${id}`).then((res) => res.data),
};

export default IncomeService;
