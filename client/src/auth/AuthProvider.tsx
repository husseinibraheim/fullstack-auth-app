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

  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {

    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);


  useEffect(() => registerUnauthorizedHandler(logout), [logout]);


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
