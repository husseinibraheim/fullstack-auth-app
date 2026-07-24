/**
 * Password policy — the client copy.
 *
 * TWIN: server/src/common/validation/password.rules.ts
 * These rules are duplicated on purpose; sharing one regex across two
 * independently-built projects was judged not worth the workspace tooling.
 * If you change a rule here, change it there too.
 *
 * The SERVER copy is authoritative. This one exists only to give fast feedback
 * while typing. If the two ever disagree, the server rejects and its message is
 * mapped onto the offending field — degraded UX, not a security hole.
 */
export const PASSWORD_MIN_LENGTH = 8;

/** bcrypt truncates at 72 bytes; beyond that two passwords could be equivalent. */
export const PASSWORD_MAX_LENGTH = 72;

export const LETTER_PATTERN = /[A-Za-z]/;
export const NUMBER_PATTERN = /[0-9]/;

/**
 * "Special" is anything that is not a letter or a digit — a negated class
 * rather than an allow-list, so a generated password containing a currency
 * symbol, a dash or a space is not rejected for no reason.
 */
export const SPECIAL_PATTERN = /[^A-Za-z0-9]/;

export interface PasswordRule {
  id: string;
  label: string;
  isMet: (value: string) => boolean;
}

/**
 * Drives the live checklist on the signup form. Requirements are shown up
 * front and tick off as they are satisfied, rather than being revealed one
 * rejection at a time.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    isMet: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'letter',
    label: 'At least one letter',
    isMet: (value) => LETTER_PATTERN.test(value),
  },
  {
    id: 'number',
    label: 'At least one number',
    isMet: (value) => NUMBER_PATTERN.test(value),
  },
  {
    id: 'special',
    label: 'At least one special character',
    isMet: (value) => SPECIAL_PATTERN.test(value),
  },
];
