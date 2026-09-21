import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { fetchCurrentUser, login as apiLogin, register as apiRegister } from '../api/auth';
import {
  clearTokens,
  getRefreshToken,
  registerLogoutHandler,
  setAccessToken,
  setRefreshToken,
} from '../api/tokenStore';
import { apiClient } from '../api/client';
import type { CurrentUser } from '../types';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  // On first load there's no access token in memory (it's never persisted),
  // but a refresh token may still be sitting in localStorage from a
  // previous session. Exchange it for a fresh access token so the user
  // doesn't have to log in again on every page reload.
  useEffect(() => {
    registerLogoutHandler(() => setUser(null));

    const refresh = getRefreshToken();
    if (!refresh) {
      setIsLoading(false);
      return;
    }

    apiClient
      .post('/api/auth/token/refresh/', { refresh })
      .then(async (response) => {
        setAccessToken(response.data.access);
        if (response.data.refresh) {
          setRefreshToken(response.data.refresh);
        }
        const me = await fetchCurrentUser();
        setUser(me);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await apiLogin(username, password);
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
    const me = await fetchCurrentUser();
    setUser(me);
  }, []);

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      await apiRegister(username, password, email);
      await login(username, password);
    },
    [login],
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
