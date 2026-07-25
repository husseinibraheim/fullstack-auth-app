import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { AppConfig } from '../config/env.config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Credential exchange and token issuing. Depends on UsersModule (one way) for
// user creation and credential verification. JWT *verification* lives in
// UsersModule; this module only *signs*.
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      // Global so the app-level TokenRenewalInterceptor can inject JwtService.
      // Signing config still lives here; UsersModule verifies, it does not sign.
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
