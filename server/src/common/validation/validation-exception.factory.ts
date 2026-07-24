import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export type FieldErrors = Record<string, string[]>;

/**
 * Collapses class-validator's tree into `field -> messages`.
 *
 * The array per field is deliberate and must not be flattened: a password can
 * fail several rules at once, and the client renders every unmet requirement
 * together rather than revealing them one rejection at a time. Nest's default
 * factory produces a flat string[] across all fields, which loses the
 * association between a message and the input it belongs to.
 */
function collect(
  errors: ValidationError[],
  parentPath = '',
  acc: FieldErrors = {},
): FieldErrors {
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      acc[path] = [...(acc[path] ?? []), ...Object.values(error.constraints)];
    }

    // Nested DTOs; unused today, but cheaper to support than to retrofit.
    if (error.children?.length) {
      collect(error.children, path, acc);
    }
  }

  return acc;
}

/**
 * Wired into the global ValidationPipe. Everything downstream (the exception
 * filter, and the frontend) depends on this shape.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    message: 'Validation failed',
    errors: collect(errors),
  });
}
