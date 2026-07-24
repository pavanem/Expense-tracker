import apiClient from './apiClient';

/**
 * Admin-only API calls for user management.
 * All endpoints require ROLE_ADMIN — a 403 means the logged-in user is not an admin.
 */
const AdminService = {
  /** Returns all user accounts ordered by creation date. */
  async listUsers() {
    const { data } = await apiClient.get('/admin/users');
    return data;
  },

  /** Creates a new user account. */
  async createUser({ username, password, role }) {
    const { data } = await apiClient.post('/admin/users', { username, password, role });
    return data;
  },

  /** Enables/disables a user or changes their role. */
  async updateUser(id, { enabled, role }) {
    const { data } = await apiClient.put(`/admin/users/${id}`, { enabled, role });
    return data;
  },

  /** Resets a user's password and revokes all their active sessions. */
  async resetPassword(id, newPassword) {
    await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
  },

  /** Permanently deletes a user account. */
  async deleteUser(id) {
    await apiClient.delete(`/admin/users/${id}`);
  },
};

export default AdminService;
