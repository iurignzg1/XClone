import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../features/auth/auth.store';
import { originOf } from './redirect';

// Rota que só faz sentido deslogado (/login, /signup). Quem já tem sessão é
// mandado de volta para a página de origem (ou para a home).
export function PublicOnlyRoute() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (user) return <Navigate to={originOf(location.state)} replace />;
  return <Outlet />;
}
