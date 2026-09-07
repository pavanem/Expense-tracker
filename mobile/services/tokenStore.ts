import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'et_access_token';
const REFRESH_TOKEN_KEY = 'et_refresh_token';
const USER_KEY = 'et_session_user';
const API_URL_KEY = 'et_api_url';

// Access token: in-memory cache for ultra-fast sync access by Axios interceptors
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

// Default API URL — your Tailscale server
export const DEFAULT_API_URL = 'http://100.103.68.49/api';

export const getAccessToken = () => accessToken;

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token;
  try {
    if (token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    }
  } catch {}
}

export function setAccessTokenSync(token: string | null) {
  accessToken = token;
}

export async function getStoredAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) accessToken = token;
    return token;
  } catch {
    return null;
  }
}

export async function clearAccessToken(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {}
}

// Refresh token: persisted in OS secure store (survives app restarts)
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch {}
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {}
}

// User session: persisted so the app knows the user across app restarts
export async function getSessionUser(): Promise<any | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setSessionUser(user: any): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch {}
}

export async function clearSessionUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {}
}

export async function clearAllAuthData(): Promise<void> {
  accessToken = null;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  } catch {}
}

// API URL: persisted so the user can change it in Settings
export async function getApiUrl(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(API_URL_KEY);
    return stored || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export async function setApiUrl(url: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(API_URL_KEY, url.trim().replace(/\/$/, ''));
  } catch {}
}

// Session expiry handler — AuthContext registers itself here
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export function notifySessionExpired() {
  if (onSessionExpired) onSessionExpired();
}
