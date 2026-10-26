import { Logo } from './components/Logo';
import { AuthPanel } from './features/auth/AuthPanel';
import { useAuthStore } from './features/auth/auth.store';
import { useRestoreSession } from './features/auth/useRestoreSession';
import { ProfilePanel } from './features/profile/ProfilePanel';
import { ThemeToggle } from './features/ui/ThemeToggle';
import { ComposePanel } from './features/tweets/ComposePanel';
import { FeedPanel } from './features/tweets/FeedPanel';

export default function App() {
  const restored = useRestoreSession();
  const user = useAuthStore((s) => s.user);

  return (
    <main>
      <header className="brand">
        <Logo />
        <div className="brand-title">
          <h1>XClone</h1>
          <p className="muted">painel de testes</p>
        </div>
        <ThemeToggle />
      </header>
      {!restored ? (
        <p className="muted">Restaurando a sessão…</p>
      ) : (
        <>
          <AuthPanel />
          {user && (
            <>
              <ComposePanel />
              <FeedPanel />
              <ProfilePanel />
            </>
          )}
        </>
      )}
    </main>
  );
}
