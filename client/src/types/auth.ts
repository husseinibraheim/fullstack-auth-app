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

/** Returned by both signup and signin, so one handler covers both. */
export interface AuthResponse {
  accessToken: string;
  user: User;
}

/**
 * The server's error envelope, normalized by the API layer so callers never
 * touch an AxiosError. `errors` is present only on 400s and maps each field to
 * every unmet rule — the shape the forms map onto their inputs.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}

/** Three-valued on purpose — see AuthContext. */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';
