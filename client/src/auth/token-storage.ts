/**
 * Single owner of the token and of its storage key.
 *
 * localStorage is a deliberate trade-off, documented in the README: the token
 * is readable by any script on this origin, so an XSS becomes token theft. In
 * exchange there is no CSRF surface at all (a header must be set explicitly by
 * JavaScript; a cross-site form post cannot add one) and no cross-origin cookie
 * configuration. The one-hour token lifetime bounds the damage.
 */
export const TOKEN_KEY = 'auth.accessToken';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
