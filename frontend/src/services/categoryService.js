import apiClient from './apiClient';

const CategoryService = {
  list: (activeOnly = false) =>
    apiClient.get('/categories', { params: { activeOnly } }).then((res) => res.data),

  get: (id) => apiClient.get(`/categories/${id}`).then((res) => res.data),

  create: (payload) => apiClient.post('/categories', payload).then((res) => res.data),

  update: (id, payload) => apiClient.put(`/categories/${id}`, payload).then((res) => res.data),

  activate: (id) => apiClient.patch(`/categories/${id}/activate`).then((res) => res.data),

  deactivate: (id) => apiClient.patch(`/categories/${id}/deactivate`).then((res) => res.data),

  remove: (id) => apiClient.delete(`/categories/${id}`).then((res) => res.data),
};

export default CategoryService;
