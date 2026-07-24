import { Controller, Get, Res } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import type { Response } from 'express';

/** Longest we will wait for the database to answer before calling it down. */
const PING_TIMEOUT_MS = 2000;

interface HealthResponse {
  status: 'ok' | 'error';
  db: 'up' | 'down';
  uptime: number;
  timestamp: string;
}

// The global JwtAuthGuard covers every route, so the probe must opt out
// explicitly — an orchestrator has no bearer token.
@Public()
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Readiness probe. Runs a real `ping` command rather than reporting a static
   * 200 or trusting `readyState` alone — a process can hold a connection object
   * whose socket is dead, and a probe that returns 200 while the database is
   * unreachable is worse than no probe at all, because it keeps traffic routed
   * at a broken instance.
   */
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponse> {
    const healthy = await this.pingDatabase();

    // Status is set explicitly rather than by throwing an HttpException so the
    // response body stays stable once a global exception filter exists.
    res.status(healthy ? 200 : 503);

    return {
      status: healthy ? 'ok' : 'error',
      db: healthy ? 'up' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async pingDatabase(): Promise<boolean> {
    // Anything other than `connected` and there is nothing to ping.
    if (
      this.connection.readyState !== ConnectionStates.connected ||
      !this.connection.db
    ) {
      return false;
    }

    try {
      // Bounded: mongo's own server-selection timeout is far longer than any
      // orchestrator's probe interval, so a hung database must not hang us.
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
