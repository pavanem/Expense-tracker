import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AuthService from '../services/authService';
import { clearAccessToken, setSessionExpiredHandler } from '../services/tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // isInitializing covers the one silent-refresh attempt on app load —
  // ProtectedRoute waits for this before deciding to redirect to /login,
  // so a page reload with a valid 30-day-old cookie doesn't flash the
  // login screen before restoring the session.
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AuthService.bootstrapSession()
      .then((sessionUser) => {
        if (!cancelled) setUser(sessionUser);
      })
      .catch(() => {
        // No valid refresh cookie (never logged in, expired, or revoked) —
        // this is the normal "not logged in yet" path, not an error to surface.
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wired into apiClient so a failed background token refresh (e.g. the
  // refresh cookie expired or was revoked mid-session) drops the user back
  // to a logged-out state instead of silently failing every request.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (username, password) => {
    const sessionUser = await AuthService.login(username, password);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const register = useCallback(async (username, password) => {
    const sessionUser = await AuthService.register(username, password);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await AuthService.logoutAllDevices();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
      logoutAllDevices,
    }),
    [user, isInitializing, login, register, logout, logoutAllDevices]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
