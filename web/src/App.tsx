import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { AuthLayout } from './components/AuthLayout';
import { NotFound } from './components/NotFound';
import { AdminPage } from './features/admin/AdminPage';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { useRestoreSession } from './features/auth/useRestoreSession';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { SearchPage } from './features/search/SearchPage';
import { HomePage } from './features/tweets/HomePage';
import { TweetPage, TweetRedirect } from './features/tweets/TweetPage';
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

      <Route element={<AppShell />}>
        {/* Abertas a visitantes: a home, os pios e os perfis (ler é livre;
            interagir pede login, e o aviso aparece na própria tela). */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/pio/:id" element={<TweetPage />} />
        <Route path="/tweet/:id" element={<TweetRedirect />} />
        {/* Só para quem tem conta. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/pesquisar" element={<SearchPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="/:username" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
