import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth.api';
import { registerUnauthorizedHandler } from '../api/client';
import type { AuthStatus, User } from '../types/auth';
import { AuthContext, type AuthContextValue } from './auth-context';
import { TOKEN_KEY, clearToken, getToken, setToken } from './token-storage';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Three-valued, not a boolean. On a refresh the app holds a token but does
  // not yet know whether it is still good; 'unknown' is that in-flight state.
  // Modelling this as `isAuthenticated: boolean` makes ProtectedRoute read
  // false during the /me call and bounce to the sign-in page, which then flips
  // back once the response lands — a visible flash on every reload.
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    // No network call: there is no logout endpoint. Nothing is stored
    // server-side, so the token stays cryptographically valid until it expires
    // — discarding it is the entire operation. No imperative navigation
    // either; ProtectedRoute observes 'anonymous' and redirects.
    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Let the axios 401 interceptor end the session through React rather than
  // through window.location.
  useEffect(() => registerUnauthorizedHandler(logout), [logout]);

  // Keep tabs in step. `storage` fires only in *other* tabs, so logging out in
  // one clears the rest instead of leaving them rendering /app against a token
  // that is gone. A null key means the whole store was cleared.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== TOKEN_KEY) return;
      if (getToken() === null) {
        setUser(null);
        setStatus('anonymous');
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setStatus('anonymous');
      return;
    }

    // StrictMode double-invokes effects in development, so a second /me can be
    // in flight when the first resolves. Ignore the loser.
    let active = true;

    authApi
      .getMe()
      .then((profile) => {
        if (!active) return;
        setUser({ id: profile.id, email: profile.email, name: profile.name });
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        // Expired, revoked, or the account is gone. Any failure means the
        // stored token is not usable.
        clearToken();
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { accessToken, user: signedIn } = await authApi.signIn({
      email,
      password,
    });
    // Persist before setting state: a route guard that evaluates before the
    // token is readable would bounce the user straight back to sign-in.
    setToken(accessToken);
    setUser(signedIn);
    setStatus('authenticated');
  }, []);

  const signUp = useCallback(
    async (email: string, name: string, password: string) => {
      const { accessToken, user: created } = await authApi.signUp({
        email,
        name,
        password,
      });
      setToken(accessToken);
      setUser(created);
      setStatus('authenticated');
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, logout }),
    [status, user, signIn, signUp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
