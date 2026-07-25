import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearToken, getToken, setToken } from '../auth/token-storage';
import type { ApiError } from '../types/auth';

/**
 * Routes where a 401 is an expected *answer*, not an expired session.
 *
 * This exclusion is the whole reason the interceptor needs a list. A wrong
 * password returns 401; without this, submitting one would trip the
 * session-expired path, clear storage and bounce the user mid-submit instead of
 * showing "Invalid email or password" on the form.
 */
const CREDENTIAL_ROUTES = ['/auth/signin', '/auth/signup'];

let onUnauthorized: (() => void) | null = null;

/**
 * Lets AuthProvider own the reaction to an expired session.
 *
 * The interceptor lives outside the React tree, so it cannot call useNavigate.
 * Rather than reaching for window.location — which forces a full reload and
 * drops SPA state — it invokes this callback; AuthProvider flips status to
 * 'anonymous' and ProtectedRoute performs the redirect declaratively.
 *
 * Returns an unsubscribe function so StrictMode's double-mount cannot leave a
 * stale handler registered.
 */
export function registerUnauthorizedHandler(handler: () => void): () => void {
  onUnauthorized = handler;
  return () => {
    if (onUnauthorized === handler) {
      onUnauthorized = null;
    }
  };
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Turns any failure — including a network error — into our envelope. */
function toApiError(error: AxiosError<Partial<ApiError>>): ApiError {
  const data = error.response?.data;

  if (error.response && data) {
    return {
      statusCode: data.statusCode ?? error.response.status,
      message: data.message ?? 'Request failed',
      errors: data.errors,
      requestId: data.requestId,
    };
  }

  // No response at all: the API is down, DNS failed, or the request timed out.
  // Invisible in development and the first thing a reviewer hits if the server
  // is not running, so it gets a real message rather than an undefined read.
  return {
    statusCode: 0,
    message:
      error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Unable to reach the server. Please check your connection.',
  };
}

apiClient.interceptors.response.use(
  (response) => {
    // Sliding session: the server re-issues a near-expiry token in this header.
    // Swap it into storage so subsequent requests carry the extended token.
    const renewed = response.headers['x-renewed-token'];
    if (typeof renewed === 'string' && renewed) {
      setToken(renewed);
    }
    return response;
  },
  (error: AxiosError<Partial<ApiError>>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isCredentialRoute = CREDENTIAL_ROUTES.some((route) =>
      url.startsWith(route),
    );

    if (status === 401 && !isCredentialRoute) {
      clearToken();
      onUnauthorized?.();
    }

    // Always re-reject: the interceptor handles the session, the caller still
    // handles its own failure.
    return Promise.reject(toApiError(error));
  },
);
