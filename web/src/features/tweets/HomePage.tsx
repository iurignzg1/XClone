import { WhoToFollow } from '../profile/WhoToFollow';
import { WIDE_LAYOUT } from '../../lib/layout';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { ComposePanel } from './ComposePanel';
import { FeedPanel } from './FeedPanel';
import styles from './HomePage.module.css';

export function HomePage() {
  // Em telas largas, "Quem seguir" fica na coluna da direita (AppShell).
  const wide = useMediaQuery(WIDE_LAYOUT);
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
