import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  triggerLogout,
} from './tokenStore';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Refreshing can be triggered by several requests failing at once (e.g. a
// page firing off a few parallel GETs right as the access token expires).
// This shares a single in-flight refresh call across all of them instead of
// racing multiple refresh requests against the one-time-use refresh token.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error('No refresh token available');
  }
  const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, { refresh });
  const { access, refresh: newRefresh } = response.data as { access: string; refresh?: string };
  setAccessToken(access);
  if (newRefresh) {
    setRefreshToken(newRefresh);
  }
  return access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error);
    }
    if (originalRequest.url?.includes('/api/auth/token/')) {
      // The login/refresh call itself failed - don't try to "refresh" that.
      clearTokens();
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      triggerLogout();
      return Promise.reject(refreshError);
    }
  },
);
