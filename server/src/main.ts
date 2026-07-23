import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/env.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Everything is namespaced under /api except the health probe, which stays
  // at the root so orchestrators and uptime checks hit a stable path.
  app.setGlobalPrefix('api', { exclude: ['health'] });

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
