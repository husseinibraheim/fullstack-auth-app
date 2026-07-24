import { ApiProperty } from '@nestjs/swagger';

/** The user as the API exposes it. Never carries the password hash. */
export class PublicUserDto {
  @ApiProperty({ example: '6a6382670730c9e0c1eb428e' })
  id!: string;

  @ApiProperty({ example: 'alice@example.com' })
  email!: string;

  @ApiProperty({ example: 'Alice' })
  name!: string;
}

/** Returned by both signup and signin — one shape, one client-side handler. */
export class AuthResponseDto {
  @ApiProperty({
    description:
      'HS256 JWT, valid for one hour. Send as `Authorization: Bearer <token>`. ' +
      'The payload is base64-encoded, not encrypted.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    type: PublicUserDto,
    description:
      'Returned alongside the token so the client need not call /auth/me ' +
      'immediately after authenticating.',
  })
  user!: PublicUserDto;
}

/** Returned by GET /auth/me — the resource itself, not wrapped. */
export class ProfileResponseDto extends PublicUserDto {
  @ApiProperty({ example: '2026-07-24T15:19:03.550Z' })
  createdAt!: Date;
}
