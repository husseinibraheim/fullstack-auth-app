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
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

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
