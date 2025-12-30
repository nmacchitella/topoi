/**
 * Auth token storage utilities
 * Stores tokens in both localStorage (for client-side) and cookies (for middleware)
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Cookie expiration: 30 days for both tokens (refresh handles actual expiration)
const ACCESS_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Set a cookie
 */
function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Save access token to both localStorage and cookies
 */
export function setAccessToken(token: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setCookie(ACCESS_TOKEN_KEY, token, ACCESS_TOKEN_MAX_AGE);
}

/**
 * Save refresh token to both localStorage and cookies
 */
export function setRefreshToken(token: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  setCookie(REFRESH_TOKEN_KEY, token, REFRESH_TOKEN_MAX_AGE);
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get a cookie by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Check if access token cookie exists
 */
export function hasAccessTokenCookie(): boolean {
  return getCookie(ACCESS_TOKEN_KEY) !== null;
}

/**
 * Clear all auth tokens from both localStorage and cookies
 */
export function clearTokens() {
  if (typeof window === 'undefined') return;

  // Clear localStorage
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  // Clear cookies
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

/**
 * Decode a JWT token without verification (client-side only)
 */
function decodeJwt(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if access token is expired or will expire within the given buffer (in seconds)
 * Returns true if token is expired, missing, or invalid
 */
export function isAccessTokenExpired(bufferSeconds: number = 60): boolean {
  const token = getAccessToken();
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;

  const expiresAt = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const buffer = bufferSeconds * 1000;

  return now >= expiresAt - buffer;
}

/**
 * Check if we have a refresh token available
 */
export function hasRefreshToken(): boolean {
  return !!getRefreshToken();
}
