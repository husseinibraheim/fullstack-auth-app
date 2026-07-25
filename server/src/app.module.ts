import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { TokenRenewalInterceptor } from './common/interceptors/token-renewal.interceptor';
import { validateEnv, type AppConfig } from './config/env.config';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HealthModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    // Throttler is global; the JWT guard is applied per-route via @UseGuards.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Slides the session by re-issuing near-expiry tokens on active requests.
    { provide: APP_INTERCEPTOR, useClass: TokenRenewalInterceptor },
  ],
})
export class AppModule {}
