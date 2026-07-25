/** The user as the API exposes it. Mirrors PublicUserDto on the server. */
export interface User {
  id: string;
  email: string;
  name: string;
}

/** GET /auth/me — the resource itself, not wrapped. */
export interface Profile extends User {
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';
