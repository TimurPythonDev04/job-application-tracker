/**
 * Token storage strategy:
 * - The access token lives only in memory (a module-level variable). It is
 *   never written to localStorage, which keeps it out of reach of anything
 *   that reads localStorage (e.g. via an XSS payload) after the tab closes.
 * - The refresh token is persisted in localStorage so the user doesn't have
 *   to log in again on every page reload. It's longer-lived but single-use:
 *   the backend rotates and blacklists it on every refresh (see
 *   SIMPLE_JWT.ROTATE_REFRESH_TOKENS / BLACKLIST_AFTER_ROTATION), so a
 *   stolen refresh token stops working the next time the real user's app
 *   refreshes.
 */
const REFRESH_KEY = 'job_tracker_refresh_token';

let accessToken: string | null = null;
let onLogout: (() => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  accessToken = null;
  setRefreshToken(null);
}

/** Registered once by AuthContext so the axios interceptor can force a
 *  logout when the refresh token itself is no longer valid. */
export function registerLogoutHandler(handler: () => void) {
  onLogout = handler;
}

export function triggerLogout() {
  clearTokens();
  onLogout?.();
}
