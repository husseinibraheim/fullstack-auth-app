import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppPage } from './pages/AppPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

/**
 * Four routes, declared inline. A route-config module plus a renderer would be
 * strictly more code than the JSX it replaces at this count.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        }
      />
      {/* Everything else, including "/", lands on the app; the guard sends
          unauthenticated visitors to sign-in from there. */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
