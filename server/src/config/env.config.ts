import { z } from 'zod';

/**
 * Environment contract for the API.
 *
 * Anything required here has no fallback: if it is missing or malformed the
 * process refuses to start. That is deliberate for JWT_SECRET in particular —
 * a default such as `process.env.JWT_SECRET ?? 'dev-secret'` looks defensive
 * but is a complete authentication bypass, since every deployment that forgets
 * the variable signs tokens anyone can forge.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  MONGO_URI: z.string().min(1, 'is required'),

  // 32 characters minimum. Generate with: openssl rand -base64 48
  JWT_SECRET: z
    .string()
    .min(
      32,
      'must be at least 32 characters — generate with `openssl rand -base64 48`',
    ),

  JWT_EXPIRES_IN: z.string().min(1).default('1h'),

  // Exact frontend origin. Never "*" — see CORS setup in main.ts.
  CORS_ORIGIN: z.url('must be a full origin, e.g. http://localhost:5173'),

  // Work factor. 12 in production; tests lower it so the suite stays fast.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Passed to ConfigModule as `validate`. Nest calls this once at boot with the
 * merged process.env + .env, and throws if we throw.
 */
export function validateEnv(raw: Record<string, unknown>): AppConfig {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    // Report variable names and reasons only. The offending *values* are never
    // included: a malformed JWT_SECRET or MONGO_URI would otherwise be printed
    // to stdout and captured by whatever collects the logs.
    const problems = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}
