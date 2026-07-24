import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth';
import { applyServerErrors } from '../forms/apply-server-errors';
import type { ApiError } from '../types/auth';

/**
 * Mirrors SignInDto. Note what is absent: none of the signup complexity rules.
 * Enforcing them here would refuse to submit a password that predates a policy
 * change, and would state the policy to someone who is not signed in.
 */
const signInSchema = z.object({
  email: z.email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required'),
});

type SignInValues = z.infer<typeof signInSchema>;

/**
 * One message regardless of whether the email is unknown or the password is
 * wrong — the same stance the API takes, so the UI cannot be used to work out
 * which addresses are registered.
 */
const INVALID_CREDENTIALS = 'Invalid email or password';

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // Token persisted and context set inside signIn, then navigate.
      await signIn(values.email, values.password);
      navigate('/app', { replace: true });
    } catch (caught) {
      const error = caught as ApiError;

      if (error.statusCode === 401) {
        setError('root', { type: 'server', message: INVALID_CREDENTIALS });
        return;
      }

      // A malformed body still gets per-field treatment; 429 and network
      // failures are form-level.
      const mapped = applyServerErrors(error, setError);
      if (!mapped) {
        setError('root', { type: 'server', message: error.message });
      }
    }
  });

  return (
    <main className="auth-page">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>Sign in</h1>

        {errors.root && (
          <p className="alert" role="alert">
            {errors.root.message}
          </p>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p className="error" id="email-error" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p className="error" id="password-error" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="switch">
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </main>
  );
}
