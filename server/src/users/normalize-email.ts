/**
 * Canonical form of an email address: trimmed and lowercased.
 *
 * This is the single source of truth for email normalization. It must be
 * applied on every write *and* every lookup — a Mongoose schema setter fires
 * on document writes but not reliably on query filters, so relying on the
 * schema alone would let `User@x.com` be stored as `user@x.com` yet fail to
 * match at login. The unique index only prevents duplicates if both sides
 * agree on the normalized value.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
