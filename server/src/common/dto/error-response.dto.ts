import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    description: 'Human-readable summary. Always a single string.',
    example: 'Validation failed',
  })
  message: string;

  @ApiPropertyOptional({
    description:
      'Present only on 400 responses. Maps each rejected field to every ' +
      'unmet rule, so a client can render them against the offending input.',
    example: {
      password: [
        'password must contain at least one number',
        'password must contain at least one special character',
      ],
    },
    additionalProperties: { type: 'array', items: { type: 'string' } },
  })
  errors?: Record<string, string[]>;

  @ApiProperty({
    description:
      'Correlates this response with the server-side log entry. Quote it ' +
      'when reporting a 500, whose body is deliberately generic.',
    example: 'e88edb65-1be5-4257-9f76-388ddbb42d7c',
  })
  requestId: string;

  @ApiProperty({ example: '2026-07-24T15:56:49.506Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/auth/signup' })
  path: string;
}
