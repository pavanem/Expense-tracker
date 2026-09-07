import { getApiClient } from './apiClient';
import {
  clearAllAuthData,
  getRefreshToken,
  getSessionUser,
  getStoredAccessToken,
  setAccessToken,
  setRefreshToken,
  setSessionUser,
} from './tokenStore';

export interface SessionUser {
  userId: number;
  username: string;
  role: 'ADMIN' | 'USER';
}

async function applyAuthResponse(data: any): Promise<SessionUser> {
  await setAccessToken(data.accessToken);
  if (data.refreshToken) {
    await setRefreshToken(data.refreshToken);
  }
  const sessionUser: SessionUser = {
    userId: data.userId,
    username: data.username,
    role: data.role,
  };
  await setSessionUser(sessionUser);
  return sessionUser;
}

const AuthService = {
  async registrationStatus(): Promise<boolean> {
    const { data } = await getApiClient().get('/auth/registration-status');
    return data.open;
  },

  async register(username: string, password: string): Promise<SessionUser> {
    const { data } = await getApiClient().post('/auth/register', { username, password });
    return await applyAuthResponse(data);
  },

  async login(username: string, password: string): Promise<SessionUser> {
    const { data } = await getApiClient().post('/auth/login', { username, password });
    return await applyAuthResponse(data);
  },

  /**
   * Called on app start — restores the session from SecureStore.
   * If a refresh token is present, attempts to rotate it against the backend.
   * If the network is temporarily unavailable (e.g. Tailscale connecting), preserves the
   * saved session so the user is NOT kicked back to the login screen.
   */
  async bootstrapSession(): Promise<SessionUser | null> {
    const storedUser = await getSessionUser();
    const storedRefresh = await getRefreshToken();
    const storedAccess = await getStoredAccessToken();

    if (storedAccess) {
      await setAccessToken(storedAccess);
    }

    if (!storedUser && !storedRefresh) {
      return null;
    }

    if (storedUser) {
      if (storedRefresh) {
        // Attempt fast background token rotation without blocking app launch if offline
        getApiClient()
          .post('/auth/refresh', { refreshToken: storedRefresh }, { timeout: 2000 })
          .then((res) => applyAuthResponse(res.data))
          .catch(async (err: any) => {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
              await clearAllAuthData();
            }
          });
      }
      return storedUser;
    }

    if (storedRefresh) {
      try {
        const { data } = await getApiClient().post(
          '/auth/refresh',
          { refreshToken: storedRefresh },
          { timeout: 2000 }
        );
        return await applyAuthResponse(data);
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          await clearAllAuthData();
        }
        return null;
      }
    }

    return null;
  },

  async logout(): Promise<void> {
    const storedRefresh = await getRefreshToken();
    try {
      await getApiClient().post('/auth/logout', storedRefresh ? { refreshToken: storedRefresh } : undefined);
    } finally {
      await clearAllAuthData();
    }
  },

  async logoutAllDevices(): Promise<void> {
    try {
      await getApiClient().post('/auth/logout-all');
    } finally {
      await clearAllAuthData();
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await getApiClient().post('/auth/change-password', { currentPassword, newPassword });
    // Server revokes all sessions — clear local tokens too
    await clearAllAuthData();
  },
};

export default AuthService;
