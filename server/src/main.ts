import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validationExceptionFactory } from './common/validation/validation-exception.factory';
import type { AppConfig } from './config/env.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);

  // Most of helmet's headers govern HTML rendering and do little for a JSON
  // API; what we actually gain is nosniff, HSTS behind TLS, and dropping
  // X-Powered-By. The CSP that would mitigate the frontend's XSS exposure has
  // to be served with the SPA's HTML, not from here.
  app.use(helmet());

  app.enableCors({
    // Exact origin from config — never "*", never `origin: true`.
    origin: config.get('CORS_ORIGIN', { infer: true }),
    methods: ['GET', 'POST'],
    // Every request carries a bearer token, so this header must be allowed
    // explicitly or the browser blocks the preflight.
    allowedHeaders: ['Content-Type', 'Authorization'],
    // The sliding-session renewal header is custom, so the browser hides it
    // from JS cross-origin unless we expose it explicitly.
    exposedHeaders: ['X-Renewed-Token'],
    // No cookies are in play; bearer tokens make this unnecessary.
    credentials: false,
    // Every authenticated request preflights. Cache it.
    maxAge: 600,
  });

  // Everything is namespaced under /api except the health probe, which stays
  // at the root so orchestrators and uptime checks hit a stable path.
  app.setGlobalPrefix('api', { exclude: ['health'] });

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
      // Produces `errors` as field -> messages instead of Nest's flat array.
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Mounted at /docs, outside the /api prefix, alongside /health.
  const openApiConfig = new DocumentBuilder()
    .setTitle('Authentication API')
    .setDescription(
      'Sign-up, sign-in and session for the fullstack-auth-app.\n\n' +
        'Authentication is a stateless HS256 JWT sent as ' +
        '`Authorization: Bearer <token>`. The session slides: a near-expiry ' +
        'token is re-issued on an active request and returned in the ' +
        '`X-Renewed-Token` response header, so an active user is not logged ' +
        'out — up to an absolute cap measured from the original login. ' +
        'Nothing is stored server-side, so a token still cannot be revoked; ' +
        'logout is a client-side act (discard the token).\n\n' +
        'Every failure returns the same envelope; `errors` appears only on ' +
        '400 responses.',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste the accessToken returned by signup or signin.',
    })
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, openApiConfig),
    { swaggerOptions: { persistAuthorization: true } },
  );

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  // Never log MONGO_URI: a production connection string carries credentials.
  Logger.log(
    `API listening on port ${port} (${config.get('NODE_ENV', { infer: true })})`,
    'Bootstrap',
  );
}

void bootstrap();
