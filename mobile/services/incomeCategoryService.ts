import { getApiClient } from './apiClient';

const IncomeCategoryService = {
  list: () => getApiClient().get('/income-categories').then((res) => res.data),
  create: (payload: object) => getApiClient().post('/income-categories', payload).then((res) => res.data),
  update: (id: number, payload: object) => getApiClient().put(`/income-categories/${id}`, payload).then((res) => res.data),
  remove: (id: number) => getApiClient().delete(`/income-categories/${id}`).then((res) => res.data),
};

export default IncomeCategoryService;
