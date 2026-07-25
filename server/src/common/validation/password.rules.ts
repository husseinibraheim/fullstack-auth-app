export const PASSWORD_MIN_LENGTH = 8;

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
  special: {
    pattern: /[^A-Za-z0-9]/,
    message: 'password must contain at least one special character',
  },
} as const;
