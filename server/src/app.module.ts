import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
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
    // Baseline for every route. Auth routes tighten this with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HealthModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    // ORDER MATTERS. APP_GUARD providers execute in registration order, so the
    // throttler runs first: an unauthenticated flood is rejected before it
    // costs us signature verification, and before it reaches auth logic at all.
    // Both are declared here rather than in their own modules precisely so the
    // order is explicit and not an artefact of module resolution.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
