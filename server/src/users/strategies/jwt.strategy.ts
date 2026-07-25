import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../config/env.config';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload & { exp: number }): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      sessionStart: payload.sessionStart,
      exp: payload.exp,
    };
  }
}
