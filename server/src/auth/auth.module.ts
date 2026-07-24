import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { AppConfig } from '../config/env.config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          // Symmetric signing. RS256 only earns its keep when a different
          // service verifies than issues; one monolith does both.
          algorithm: 'HS256',
          // Expiry is the only revocation mechanism we have, so its duration
          // is a security parameter, not a convenience setting.
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  // JwtAuthGuard is registered as a global APP_GUARD in AppModule, alongside
  // the throttler, so their execution order is explicit. It is exported here
  // for completeness.
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
