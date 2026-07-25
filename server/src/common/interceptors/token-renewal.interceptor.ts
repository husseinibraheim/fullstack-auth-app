import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import type { AppConfig } from '../../config/env.config';
import { parseDurationToSeconds } from '../duration';
import type { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';

export const RENEWED_TOKEN_HEADER = 'X-Renewed-Token';

/**
 * Sliding-session renewal. On an authenticated request whose token is within its
 * final SESSION_RENEW_WITHIN of life, mints a fresh token — carrying the same
 * sessionStart — and returns it in a response header for the client to swap in.
 *
 * Renewal stops once sessionStart + SESSION_ABSOLUTE_MAX has passed, so an
 * active session cannot slide forever. This stays fully stateless: there is no
 * session store, and therefore still no revocation — a stolen token that keeps
 * being used renews itself up to the absolute cap.
 */
@Injectable()
export class TokenRenewalInterceptor implements NestInterceptor {
  private readonly window: number;
  private readonly absoluteMax: number;
  private readonly renewWithin: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.window = parseDurationToSeconds(
      config.get('JWT_EXPIRES_IN', { infer: true }),
    );
    this.absoluteMax = parseDurationToSeconds(
      config.get('SESSION_ABSOLUTE_MAX', { infer: true }),
    );
    this.renewWithin = parseDurationToSeconds(
      config.get('SESSION_RENEW_WITHIN', { infer: true }),
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    // Set by JwtStrategy on guarded routes only; undefined on public ones.
    const user = http.getRequest<Request>().user as
      AuthenticatedUser | undefined;

    if (user?.exp && user.sessionStart) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = user.exp - now;
      const capRemaining = user.sessionStart + this.absoluteMax - now;

      if (remaining < this.renewWithin && capRemaining > 0) {
        // Cap the new lifetime so the token cannot outlive the absolute maximum.
        const ttl = Math.min(this.window, capRemaining);
        const payload: JwtPayload = {
          sub: user.userId,
          email: user.email,
          sessionStart: user.sessionStart,
        };
        const token = this.jwt.sign(payload, { expiresIn: ttl });
        http.getResponse<Response>().setHeader(RENEWED_TOKEN_HEADER, token);
      }
    }

    return next.handle();
  }
}
