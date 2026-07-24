import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../users/normalize-email';

/**
 * HTTP contract for POST /auth/signin.
 *
 * Note what is absent: no complexity rules, and no inheritance from SignUpDto.
 * Applying the signup policy to a login body would (a) permanently lock out
 * any account whose password predates a policy change, and (b) echo the
 * password rules back to unauthenticated callers through validation errors.
 *
 * A login body only has to be well-formed enough to look up and compare.
 */
export class SignInDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  // Bounded only to stop an oversized body reaching bcrypt; not a policy rule.
  @MaxLength(200)
  password!: string;
}
