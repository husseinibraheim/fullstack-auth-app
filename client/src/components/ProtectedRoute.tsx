import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

/**
 * Gate for authenticated routes, and the reason auth state is three-valued.
 *
 * On 'unknown' it renders a spinner rather than redirecting: the token is being
 * checked, and treating not-yet-known as not-authenticated is what produces the
 * flash of the sign-in page on every refresh.
 *
 * It is also the only place that navigates on session loss. logout() and the
 * 401 interceptor just set 'anonymous'; the redirect follows from that.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'unknown') {
    return (
      <div role="status" aria-live="polite" className="route-loading">
        <span className="visually-hidden">Checking your session…</span>
      </div>
    );
  }

  if (status === 'anonymous') {
    // `replace` so the guarded URL does not sit one back-press away.
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
