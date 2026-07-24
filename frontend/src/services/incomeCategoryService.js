import apiClient from './apiClient';

const IncomeCategoryService = {
  list: (activeOnly = false) =>
    apiClient.get('/income-categories', { params: { activeOnly } }).then((res) => res.data),

  get: (id) => apiClient.get(`/income-categories/${id}`).then((res) => res.data),

  create: (payload) => apiClient.post('/income-categories', payload).then((res) => res.data),

  update: (id, payload) => apiClient.put(`/income-categories/${id}`, payload).then((res) => res.data),

  activate: (id) => apiClient.patch(`/income-categories/${id}/activate`).then((res) => res.data),

  deactivate: (id) => apiClient.patch(`/income-categories/${id}/deactivate`).then((res) => res.data),

  remove: (id) => apiClient.delete(`/income-categories/${id}`).then((res) => res.data),
};

export default IncomeCategoryService;
