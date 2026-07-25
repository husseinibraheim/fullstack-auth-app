import { ApiProperty } from '@nestjs/swagger';

// Returned by GET /users/me — the resource itself, not wrapped. Declared
// standalone rather than extending auth's PublicUserDto so UsersModule carries
// no dependency on AuthModule.
export class ProfileResponseDto {
  @ApiProperty({ example: '6a6382670730c9e0c1eb428e' })
  id: string;

  @ApiProperty({ example: 'alice@example.com' })
  email: string;

  @ApiProperty({ example: 'Alice' })
  name: string;

  @ApiProperty({ example: '2026-07-24T15:19:03.550Z' })
  createdAt: Date;
}
