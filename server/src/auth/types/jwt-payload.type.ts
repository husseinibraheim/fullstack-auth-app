/**
 * JWT claims. Minimal on purpose: the payload is base64-encoded, not
 * encrypted, so it is readable by anyone holding the token. It also cannot be
 * updated once issued — caching something mutable here (a display name, a
 * role) means serving stale data until the token expires.
 *
 * `sub` is the user's id and the only claim used for lookups.
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** What JwtStrategy.validate() attaches to request.user. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}
