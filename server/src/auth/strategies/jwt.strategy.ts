import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../config/env.config';
import type { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      // Header only. Accepting a token from a query string would leak it into
      // access logs, browser history and Referer headers.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Expiry is enforced by passport-jwt itself; never hand-roll the check.
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  /**
   * Runs after the signature and `exp` have been verified.
   *
   * ACCEPTED TRADEOFF — no database lookup happens here, by design. The guard
   * stays stateless and costs nothing per request, but that means a token
   * remains valid until it expires even if the account has since been deleted,
   * and logout cannot invalidate anything server-side. The one-hour lifetime
   * is the only bound on that window.
   *
   * The single place a deleted account is detected is GET /auth/me, which is
   * the only handler that reads the database — and it answers 401, not 404.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
