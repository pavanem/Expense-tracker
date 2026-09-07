import { getApiClient } from './apiClient';

const CategoryService = {
  list: () => getApiClient().get('/categories').then((res) => res.data),
  create: (payload: object) => getApiClient().post('/categories', payload).then((res) => res.data),
  update: (id: number, payload: object) => getApiClient().put(`/categories/${id}`, payload).then((res) => res.data),
  remove: (id: number) => getApiClient().delete(`/categories/${id}`).then((res) => res.data),
};

export default CategoryService;
