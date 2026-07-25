import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function AppPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/signin', { replace: true });
  }

  return (
    <main className="app-page">
      <div className="card">
        <h1>Welcome to the application.</h1>

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
