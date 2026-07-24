import { createContext } from 'react';
import type { AuthStatus, User } from '../types/auth';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

/**
 * Kept in its own module, separate from the provider component: a file that
 * exports both a component and a non-component breaks React Fast Refresh.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
