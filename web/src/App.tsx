import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { AuthLayout } from './components/AuthLayout';
import { NotFound } from './components/NotFound';
import { AdminPage } from './features/admin/AdminPage';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { useRestoreSession } from './features/auth/useRestoreSession';
import { ProfilePage } from './features/profile/ProfilePage';
import { SearchPage } from './features/search/SearchPage';
import { HomePage } from './features/tweets/HomePage';
import { TweetPage } from './features/tweets/TweetPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';
import shared from './styles/shared.module.css';

export default function App() {
  const restored = useRestoreSession();

  // Só decide a rota depois de tentar restaurar a sessão; senão quem recarrega
  // a página seria mandado para /login por um instante.
  if (!restored) return <p className={shared.muted}>Restaurando a sessão…</p>;

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/pesquisar" element={<SearchPage />} />
          <Route path="/pio/:id" element={<TweetPage />} />
          <Route path="/:username" element={<ProfilePage />} />
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
