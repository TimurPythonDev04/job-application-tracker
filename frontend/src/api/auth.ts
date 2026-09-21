import { apiClient } from './client';
import type { AuthTokens, CurrentUser } from '../types';

export async function login(username: string, password: string): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>('/api/auth/token/', { username, password });
  return response.data;
}

export async function register(
  username: string,
  password: string,
  email?: string,
): Promise<void> {
  await apiClient.post('/api/auth/register/', { username, password, email: email ?? '' });
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiClient.get<CurrentUser>('/api/auth/me/');
  return response.data;
}
