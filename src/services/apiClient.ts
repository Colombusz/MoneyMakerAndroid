import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './secureStorage';

// Reads EXPO_PUBLIC_API_URL from .env / EAS build environment, falling back to local IP for dev
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.40:4000';

let customBaseUrl: string | null = null;

export const setApiBaseUrl = (url: string) => {
  customBaseUrl = url;
};

export const getApiBaseUrl = () => {
  return customBaseUrl || DEFAULT_API_URL;
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (!options.skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error: any) {
    throw new Error(`Network request failed: ${error.message}`);
  }

  // Handle Token Expiration (401)
  const isAuthEndpointThatCannotRefresh =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh');

  if (response.status === 401 && !options.skipAuth && !isAuthEndpointThatCannotRefresh) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          await saveTokens(data.accessToken, data.refreshToken);

          // Retry with new access token
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          const retryResponse = await fetch(url, { ...options, headers });
          if (!retryResponse.ok) {
            const err = await retryResponse.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${retryResponse.status}`);
          }
          return await retryResponse.json();
        } else if (refreshResponse.status === 401 || refreshResponse.status === 403) {
          await clearTokens();
          throw new Error('Session expired, please log in again.');
        } else {
          throw new Error('Authentication server temporarily unavailable.');
        }
      } catch (err: any) {
        if (err?.message === 'Session expired, please log in again.') {
          throw err;
        }
        // Network error during refresh, do not clear tokens
        throw err;
      }
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP Error ${response.status}`);
  }

  return await response.json();
};
