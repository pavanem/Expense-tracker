import axios, { AxiosInstance } from 'axios';
import {
  clearAllAuthData,
  getAccessToken,
  getApiUrl,
  getRefreshToken,
  getStoredAccessToken,
  notifySessionExpired,
  setAccessToken,
  setRefreshToken,
  DEFAULT_API_URL,
} from './tokenStore';

// We create the client lazily so it picks up the stored API URL on first use.
let _client: AxiosInstance | null = null;
let _baseURL: string = DEFAULT_API_URL;

export function getBaseUrl() {
  return _baseURL;
}

export async function initApiClient(): Promise<void> {
  _baseURL = await getApiUrl();
  await getStoredAccessToken();
  _client = createClient(_baseURL);
}

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
    },
  });

  // Explicitly ensure X-Client-Type and Authorization on every request
  client.interceptors.request.use((config) => {
    config.headers['X-Client-Type'] = 'mobile';
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Single shared refresh promise to avoid racing concurrent 401s
  let refreshPromise: Promise<string> | null = null;

  async function performRefresh(): Promise<string> {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const storedRefresh = await getRefreshToken();
        if (!storedRefresh) throw new Error('No refresh token stored');

        const response = await axios.post(
          `${_baseURL}/auth/refresh`,
          { refreshToken: storedRefresh },
          { headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'mobile' } }
        );
        const { accessToken, refreshToken: newRefresh } = response.data;
        await setAccessToken(accessToken);
        if (newRefresh) await setRefreshToken(newRefresh);
        return accessToken;
      })().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const status = error?.response?.status;
      const isAuthEndpoint = original?.url?.includes('/auth/');

      if (status === 401 && !isAuthEndpoint && !original._retried) {
        original._retried = true;
        try {
          const newToken = await performRefresh();
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        } catch {
          await clearAllAuthData();
          notifySessionExpired();
          return Promise.reject(attachFriendlyMessage(error));
        }
      }
      return Promise.reject(attachFriendlyMessage(error));
    }
  );

  return client;
}

function attachFriendlyMessage(error: any) {
  const backendMessage = error?.response?.data?.message;
  const fieldErrors = error?.response?.data?.fieldErrors;
  let message = backendMessage || 'Something went wrong. Please try again.';
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    message = Object.values(fieldErrors).join(' ');
  }
  if (!error.response) {
    message = 'Cannot reach the server. Check your Tailscale connection.';
  }
  return { ...error, friendlyMessage: message };
}

// Singleton getter — falls back to a default client if init hasn't run yet
export function getApiClient(): AxiosInstance {
  if (!_client) {
    _client = createClient(_baseURL);
  }
  return _client;
}

// Called from Settings when the user changes the server URL
export async function updateApiUrl(newUrl: string): Promise<void> {
  _baseURL = newUrl;
  _client = createClient(newUrl);
}
