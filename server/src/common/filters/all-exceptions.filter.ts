import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { FieldErrors } from '../validation/validation-exception.factory';

/** Mongo's duplicate-key error code. */
const DUPLICATE_KEY = 11000;

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: FieldErrors;
  requestId: string;
  timestamp: string;
  path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDuplicateKeyError(err: unknown): boolean {
  return isRecord(err) && err.code === DUPLICATE_KEY;
}

function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (v) => Array.isArray(v) && v.every((m) => typeof m === 'string'),
    )
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const headerId = request.headers['x-request-id'];
    const requestId = typeof headerId === 'string' ? headerId : randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: FieldErrors | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (isRecord(payload)) {
        message =
          typeof payload.message === 'string'
            ? payload.message
            : exception.message;

        if (
          status === HttpStatus.BAD_REQUEST &&
          isFieldErrors(payload.errors)
        ) {
          errors = payload.errors;
        }
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        message = 'Too many requests, please try again later';
      }
    } else if (isDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      message = 'A record with that value already exists';
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (
      status === HttpStatus.UNAUTHORIZED ||
      status === HttpStatus.TOO_MANY_REQUESTS
    ) {
      this.logger.warn(
        `${request.method} ${request.url} -> ${status} [${requestId}]`,
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(status).json(body);
  }
}
