import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function AppPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    // Clears the token and resets context to 'anonymous'. No network call:
    // there is no logout endpoint, because nothing is stored server-side and
    // the token stays valid until it expires.
    logout();
    // `replace` so the app page is not one back-press away. ProtectedRoute
    // would also redirect on the state change; navigating explicitly makes the
    // intent obvious at the call site rather than implicit in the guard.
    navigate('/signin', { replace: true });
  }

  return (
    <main className="app-page">
      <div className="card">
        <h1>Welcome to the application.</h1>

        {/* The name comes from /auth/me via context, so this line is proof the
            protected endpoint works — not just a static string. */}
        {user && (
          <p className="greeting">
            Signed in as <strong>{user.name}</strong> ({user.email})
          </p>
        )}

        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </main>
  );
}
