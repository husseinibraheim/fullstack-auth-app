import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '../types/auth';

/**
 * Maps the server's `errors` field-map onto react-hook-form, so a 400 renders
 * under the offending input exactly like a client-side failure instead of as a
 * detached banner.
 *
 * This is what makes the duplicated password rules invisible to users: if the
 * client copy ever drifts from the server's, the rejection still appears in the
 * right place with the right wording.
 *
 * Returns true if at least one field error was applied, so the caller knows
 * whether it still needs a form-level message.
 */
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
      // A field can fail several rules at once; the server sends all of them.
      message: messages.join('. '),
    });
    applied = true;
  }

  return applied;
}
