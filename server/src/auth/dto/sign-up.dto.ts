import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from '../../common/validation/password.rules';
import { normalizeEmail } from '../../users/normalize-email';

/**
 * HTTP contract for POST /auth/signup — the full signup policy.
 *
 * Deliberately NOT shared with SignInDto: complexity rules must never apply to
 * a login body. See sign-in.dto.ts.
 */
export class SignUpDto {
  @ApiProperty({
    example: 'alice@example.com',
    maxLength: 254,
    description:
      'Stored lowercased and trimmed; lookups normalize the same way.',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

  @ApiProperty({
    example: 'Alice',
    minLength: 3,
    maxLength: 50,
    description:
      'Trimmed before validation, so whitespace cannot pad it to length.',
  })
  // Trim runs before length validation (ValidationPipe transforms first), so
  // "  ab  " correctly fails the 3-character minimum rather than passing on
  // whitespace.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3, { message: 'name must be at least 3 characters' })
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    example: 'Sup3r$ecret',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description:
      `Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters, and must contain at least ` +
      'one letter, one number, and one special character (anything that is ' +
      'not a letter or a digit). Each rule is checked separately, so a ' +
      'rejection lists every unmet requirement at once. The upper bound is ' +
      "bcrypt's 72-byte truncation point.",
  })
  // Each rule is asserted separately so the response can name every unmet
  // requirement at once, instead of revealing them one rejection at a time.
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  @Matches(PASSWORD_RULES.letter.pattern, {
    message: PASSWORD_RULES.letter.message,
  })
  @Matches(PASSWORD_RULES.number.pattern, {
    message: PASSWORD_RULES.number.message,
  })
  @Matches(PASSWORD_RULES.special.pattern, {
    message: PASSWORD_RULES.special.message,
  })
  password!: string;
}
