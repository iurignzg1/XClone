import { useAuthStore } from '../auth/auth.store';
import { WhoToFollow } from '../profile/WhoToFollow';
import { WIDE_LAYOUT } from '../../lib/layout';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { ComposePanel } from './ComposePanel';
import { FeedPanel } from './FeedPanel';
import { GuestHome } from './GuestHome';
import styles from './HomePage.module.css';

// Quem tem conta vê o feed; o visitante vê a página inicial pública.
export function HomePage() {
  const loggedIn = useAuthStore((s) => s.user !== null);
  // Em telas largas, "Quem seguir" fica na coluna da direita (AppShell).
  const wide = useMediaQuery(WIDE_LAYOUT);

  if (!loggedIn) return <GuestHome />;
  return (
    <FeedPanel
      top={
        <>
          <ComposePanel />
          {!wide && (
            <div className={styles.suggestions}>
              <WhoToFollow />
            </div>
          )}
        </>
      }
    />
  );
}
