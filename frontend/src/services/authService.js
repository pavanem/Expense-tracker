import axios from 'axios';
import apiClient from './apiClient';
import { setAccessToken } from './tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function applyAuthResponse(data) {
  setAccessToken(data.accessToken);
  return {
    userId: data.userId,
    username: data.username,
    role: data.role,
  };
}

const AuthService = {
  async registrationStatus() {
    const { data } = await apiClient.get('/auth/registration-status');
    return data.open;
  },

  async register(username, password) {
    const { data } = await apiClient.post('/auth/register', { username, password });
    return applyAuthResponse(data);
  },

  async login(username, password) {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return applyAuthResponse(data);
  },

  /**
   * Used only once, on app load, to silently turn the httpOnly refresh
   * cookie (if still valid — up to 30 days old) back into a fresh access
   * token without the user re-entering credentials. Uses a bare axios call
   * rather than apiClient deliberately, so a 401 here never triggers
   * apiClient's own refresh-retry logic — this *is* the refresh call.
   */
  async bootstrapSession() {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    return applyAuthResponse(data);
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },

  async logoutAllDevices() {
    await apiClient.post('/auth/logout-all');
  },

  async changePassword(currentPassword, newPassword) {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },
};

export default AuthService;
