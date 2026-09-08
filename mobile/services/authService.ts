import { getApiClient, refreshSession } from './apiClient';
import {
  clearAllAuthData,
  getRefreshToken,
  getSessionUser,
  getStoredAccessToken,
  isJwtExpired,
  notifySessionExpired,
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
   * If a refresh token is present and the access token has expired (> 15 mins),
   * coordinates token refresh via the shared refreshSession to avoid racing with screen API calls.
   * If the network is temporarily unavailable (e.g. Tailscale connecting or offline),
   * preserves the saved session so the user is NEVER kicked back to the login screen.
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
      // If access token is expired (> 15 mins), perform background refresh using the
      // shared refreshSession promise. Any concurrent screen API calls will join this
      // exact promise instead of firing duplicate refresh requests.
      if (storedRefresh && isJwtExpired(storedAccess)) {
        refreshSession().catch(async (err: any) => {
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            await clearAllAuthData();
            notifySessionExpired();
          }
          // Network errors: leave storedUser intact so the user can use the app offline!
        });
      }
      return storedUser;
    }

    if (storedRefresh) {
      try {
        await refreshSession();
        return await getSessionUser();
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
