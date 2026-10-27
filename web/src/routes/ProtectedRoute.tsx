import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore, type SessionUser } from '../features/auth/auth.store';
import { HOME } from './redirect';

// Rota privada. Sem login, vai para /login guardando de onde veio. Com `role`,
// só deixa passar quem tem esse papel (ex.: /admin só para ADMIN).
export function ProtectedRoute({ role }: { role?: SessionUser['role'] }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to={HOME} replace />;
  return <Outlet />;
}
