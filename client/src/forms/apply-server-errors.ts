import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '../types/auth';


export function applyServerErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
): boolean {
  if (!error.errors) {
    return false;
  }

  let applied = false;

  for (const [field, messages] of Object.entries(error.errors)) {
    if (messages.length === 0) continue;
    setError(field as Path<T>, {
      type: 'server',
      message: messages.join('. '),
    });
    applied = true;
  }

  return applied;
}
