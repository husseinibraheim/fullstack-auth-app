import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../normalize-email';

/**
 * Input contract for creating a user.
 *
 * Scope note: this carries the *structural* field rules — email format, name
 * length, and password length bounds. The signup password *complexity* rules
 * (letter / number / special) live on AuthModule's SignUpDto, next to the
 * shared password-rule source. The 72-char password cap lives here on purpose:
 * bcrypt truncates input at 72 bytes, so without the cap two different long
 * passwords would hash to the same value. The cap belongs next to the code
 * that hashes.
 */
export class CreateUserDto {
  @IsEmail()
  @MaxLength(254) // RFC 5321 maximum; also bounds the unique-index key size.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email!: string;

  // Trim runs before length validation (ValidationPipe transforms, then
  // validates), so "  ab  " correctly fails the 3-char minimum.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
