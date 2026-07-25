export interface JwtPayload {
  sub: string;
  email: string;
  // Unix seconds of the original login. Copied unchanged on every renewal, so
  // it anchors the absolute-session cap regardless of how often the token slides.
  sessionStart: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionStart: number;
  // Token expiry (unix seconds), read by the renewal interceptor.
  exp: number;
}
