import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the globally-registered JwtAuthGuard.
 *
 * The guard is global so routes are protected by default: forgetting a
 * decorator leaves an endpoint closed rather than open. Opening one is
 * therefore always a deliberate, greppable act.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
