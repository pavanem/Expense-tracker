import { getApiClient } from './apiClient';

const AdminService = {
  listUsers: () => getApiClient().get('/admin/users').then((res) => res.data),
  createUser: (payload: object) => getApiClient().post('/admin/users', payload).then((res) => res.data),
  updateUser: (id: number, payload: object) => getApiClient().put(`/admin/users/${id}`, payload).then((res) => res.data),
  resetPassword: (id: number, payload: object) => getApiClient().post(`/admin/users/${id}/reset-password`, payload).then((res) => res.data),
  deleteUser: (id: number) => getApiClient().delete(`/admin/users/${id}`).then((res) => res.data),
};

export default AdminService;
