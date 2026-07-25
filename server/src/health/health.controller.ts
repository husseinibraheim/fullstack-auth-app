import { Controller, Get, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Connection, ConnectionStates } from 'mongoose';
import { HealthResponseDto } from './dto/health-response.dto';

const PING_TIMEOUT_MS = 2000;

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Unauthenticated, and served outside the /api prefix. Runs a real ping ' +
      'against MongoDB rather than returning a static 200, because a probe ' +
      'that reports healthy while the database is unreachable keeps traffic ' +
      'routed at a broken instance.',
  })
  @ApiOkResponse({
    description: 'Database reachable.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'Database unreachable; body carries status "error", db "down".',
    type: HealthResponseDto,
  })
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    const healthy = await this.pingDatabase();

    res.status(healthy ? 200 : 503);

    return {
      status: healthy ? 'ok' : 'error',
      db: healthy ? 'up' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async pingDatabase(): Promise<boolean> {
    if (
      this.connection.readyState !== ConnectionStates.connected ||
      !this.connection.db
    ) {
      return false;
    }

    try {
      await Promise.race([
        this.connection.db.admin().ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('ping timed out')),
            PING_TIMEOUT_MS,
          ),
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}
