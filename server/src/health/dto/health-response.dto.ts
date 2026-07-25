import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: 'ok' | 'error';

  @ApiProperty({
    enum: ['up', 'down'],
    example: 'up',
    description: 'Result of a real ping against MongoDB, not a cached flag.',
  })
  db: 'up' | 'down';

  @ApiProperty({ description: 'Process uptime in seconds.', example: 259 })
  uptime: number;

  @ApiProperty({ example: '2026-07-24T15:19:03.550Z' })
  timestamp: string;
}
