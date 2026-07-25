import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export type FieldErrors = Record<string, string[]>;

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

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    message: 'Validation failed',
    errors: collect(errors),
  });
}
