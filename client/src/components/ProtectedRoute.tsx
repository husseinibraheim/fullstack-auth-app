import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

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
