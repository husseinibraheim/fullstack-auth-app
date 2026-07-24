import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/env.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Everything is namespaced under /api except the health probe, which stays
  // at the root so orchestrators and uptime checks hit a stable path.
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Without this the DTO decorators are inert, so it ships with the DTOs
  // rather than with the rest of the hardening pass.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties with no decorator, and reject bodies that carry them.
      // Blocks mass assignment and surfaces client bugs instead of swallowing.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Required for @Transform (email normalization, name trimming) to run.
      transform: true,
      // Implicit coercion turns "0" into 0 and "false" into false in places
      // you did not ask for.
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('PORT', { infer: true });

  await app.listen(port);

  // Never log MONGO_URI: a production connection string carries credentials.
  Logger.log(
    `API listening on port ${port} (${config.get('NODE_ENV', { infer: true })})`,
    'Bootstrap',
  );
}

void bootstrap();
