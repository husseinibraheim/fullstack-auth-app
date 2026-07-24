/**
 * Password policy — the authoritative copy.
 *
 * TWIN: client/src/validation/password.rules.ts
 * These rules are duplicated in the frontend on purpose; sharing one regex
 * across two independently-built projects was judged not worth the workspace
 * tooling. If you change a rule here, change it there too.
 *
 * The server copy is authoritative: the client copy exists only to give fast
 * feedback while typing. If the two ever disagree, the server rejects and the
 * user sees the error mapped onto the offending field — degraded UX, not a
 * security hole.
 *
 * Each rule is a *presence* check, so the regexes are deliberately unanchored.
 * They are kept as separate checks rather than one combined lookahead so the
 * API can report exactly which requirements are unmet, not just "invalid".
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt truncates input at 72 bytes: without this cap two different long
 * passwords could hash to the same value and be interchangeable at login.
 */
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_RULES = {
  letter: {
    pattern: /[A-Za-z]/,
    message: 'password must contain at least one letter',
  },
  number: {
    pattern: /[0-9]/,
    message: 'password must contain at least one number',
  },
  // "Special" is anything that is not a letter or a digit — a negated class
  // rather than an explicit allow-list, so generated passwords containing
  // currency symbols, dashes or spaces are not rejected for no reason.
  special: {
    pattern: /[^A-Za-z0-9]/,
    message: 'password must contain at least one special character',
  },
} as const;
