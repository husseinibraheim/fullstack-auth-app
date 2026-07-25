import { apiClient } from './client';
import type { AuthResponse, Profile } from '../types/auth';

export interface SignUpPayload {
  email: string;
  name: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export async function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/signup', payload);
  return data;
}

export async function signIn(payload: SignInPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/signin', payload);
  return data;
}

/**
 * Confirms a stored token is still valid and resolves who it belongs to.
 * Called once on boot; not after signup/signin, whose responses already carry
 * the user.
 */
export async function getMe(): Promise<Profile> {
  const { data } = await apiClient.get<Profile>('/users/me');
  return data;
}
