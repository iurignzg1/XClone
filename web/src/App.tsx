import { AuthPanel } from './features/auth/AuthPanel';
import { useAuthStore } from './features/auth/auth.store';
import { useRestoreSession } from './features/auth/useRestoreSession';
import { ProfilePanel } from './features/profile/ProfilePanel';
import { ComposePanel } from './features/tweets/ComposePanel';
import { FeedPanel } from './features/tweets/FeedPanel';

export default function App() {
  const restored = useRestoreSession();
  const user = useAuthStore((s) => s.user);

  return (
    <main>
      <h1>XClone · painel de testes</h1>
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
