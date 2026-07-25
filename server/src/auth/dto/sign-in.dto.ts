import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../users/normalize-email';

export class SignInDto {
  @ApiProperty({ example: 'alice@example.com', maxLength: 254 })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  email: string;

  @ApiProperty({
    example: 'Sup3r$ecret',
    maxLength: 200,
    description:
      'Only required to be a non-empty string. The signup complexity rules ' +
      'deliberately do not apply here: enforcing them would lock out any ' +
      'password predating a policy change, and would echo the rules back to ' +
      'unauthenticated callers.',
  })
  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  @MaxLength(200)
  password: string;
}
