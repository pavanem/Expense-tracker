import axios from 'axios';
import { clearAccessToken, getAccessToken, notifySessionExpired, setAccessToken } from './tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Required so the httpOnly refresh-token cookie is sent on /auth/refresh
  // and /auth/logout — irrelevant for same-origin (the standard Nginx
  // deployment) but needed for cross-origin local dev (frontend :5173,
  // backend :8080).
  withCredentials: true,
});

// Attaches the in-memory access token to every request. Auth endpoints
// themselves don't need it (register/login/refresh are public), but
// sending it there too is harmless.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Concurrent requests that all 401 at once (e.g. a dashboard firing several
// calls right as the access token expires) must not each trigger their own
// refresh — that would race against the single-use refresh token rotation
// on the backend and fail all but one. This shares a single in-flight
// refresh promise across all of them.
let refreshPromise = null;

function performRefresh() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      })
      .then((response) => {
        setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (status === 401 && !isAuthEndpoint && !originalRequest._retried) {
      originalRequest._retried = true;
      try {
        const newToken = await performRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        notifySessionExpired();
        return Promise.reject(attachFriendlyMessage(refreshError));
      }
    }

    return Promise.reject(attachFriendlyMessage(error));
  }
);

function attachFriendlyMessage(error) {
  const backendMessage = error?.response?.data?.message;
  const fieldErrors = error?.response?.data?.fieldErrors;
  let message = backendMessage || 'Something went wrong. Please try again.';
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    message = Object.values(fieldErrors).join(' ');
  }
  if (!error.response) {
    message = 'Cannot reach the server. Check your connection and try again.';
  }
  return { ...error, friendlyMessage: message };
}

export default apiClient;
