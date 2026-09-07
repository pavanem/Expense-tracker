import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AuthService, { SessionUser } from '../services/authService';
import { clearAllAuthData, setSessionExpiredHandler } from '../services/tokenStore';
import { initApiClient } from '../services/apiClient';

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<SessionUser>;
  register: (username: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Initialize the API client with the stored URL first, then restore the session
    initApiClient()
      .then(() => AuthService.bootstrapSession())
      .then((sessionUser) => {
        if (!cancelled && sessionUser) {
          setUser(sessionUser);
        }
      })
      .catch(() => {
        // Not logged in or session expired
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const sessionUser = await AuthService.login(username, password);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const sessionUser = await AuthService.register(username, password);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      await clearAllAuthData();
      setUser(null);
    }
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await AuthService.logoutAllDevices();
    } finally {
      await clearAllAuthData();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isInitializing, login, register, logout, logoutAllDevices }),
    [user, isInitializing, login, register, logout, logoutAllDevices]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
