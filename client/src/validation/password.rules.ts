export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MAX_LENGTH = 72;

export const LETTER_PATTERN = /[A-Za-z]/;
export const NUMBER_PATTERN = /[0-9]/;


export const SPECIAL_PATTERN = /[^A-Za-z0-9]/;

export interface PasswordRule {
  id: string;
  label: string;
  isMet: (value: string) => boolean;
}


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
