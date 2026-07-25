import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth';
import { applyServerErrors } from '../forms/apply-server-errors';
import type { ApiError } from '../types/auth';
import {
  LETTER_PATTERN,
  NUMBER_PATTERN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  SPECIAL_PATTERN,
} from '../validation/password.rules';


const signUpSchema = z.object({
  email: z.email('Enter a valid email address').max(254),
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
    .regex(LETTER_PATTERN, 'Password must contain at least one letter')
    .regex(NUMBER_PATTERN, 'Password must contain at least one number')
    .regex(SPECIAL_PATTERN, 'Password must contain at least one special character'),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),

    mode: 'onTouched',
    defaultValues: { email: '', name: '', password: '' },
  });

  const password = watch('password');

  const onSubmit = handleSubmit(async (values) => {
    try {

      await signUp(values.email, values.name, values.password);
      navigate('/app', { replace: true });
    } catch (caught) {
      const error = caught as ApiError;

      const mapped = applyServerErrors(error, setError);
      if (!mapped) {
        setError('root', { type: 'server', message: error.message });
      }
    }
  });

  return (
    <main className="auth-page">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>

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
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          {errors.name && (
            <p className="error" id="name-error" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={
              errors.password ? 'password-rules password-error' : 'password-rules'
            }
            {...register('password')}
          />

          {/* Requirements shown up front rather than as successive failures. */}
          <ul className="rules" id="password-rules">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.isMet(password);
              return (
                <li key={rule.id} className={met ? 'met' : 'unmet'}>
                  <span aria-hidden="true">{met ? '✓' : '○'}</span>
                  <span>{rule.label}</span>
                  <span className="visually-hidden">
                    {met ? ' (met)' : ' (not yet met)'}
                  </span>
                </li>
              );
            })}
          </ul>

          {errors.password && (
            <p className="error" id="password-error" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="switch">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
