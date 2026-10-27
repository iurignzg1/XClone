import type { ReactNode } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import { TweetCard } from './TweetCard';
import { TweetSkeletons } from './TweetSkeleton';
import { useFeed } from './useFeed';
import styles from './FeedPanel.module.css';
import shared from '../../styles/shared.module.css';

// `top` é o que vem logo abaixo do título e antes dos pios (o composer).
export function FeedPanel({ top }: { top?: ReactNode }) {
  const { tweets, loaded, loading, error, refetch, loadMore, loadingMore, moreError, hasMore, ended } = useFeed();

  return (
    <section className={styles.feed}>
      <h2 className={styles.heading}>
        Feed <button className={shared.outline} onClick={() => void refetch()}>Atualizar</button>
      </h2>
      {top}
      {loading && <TweetSkeletons />}
      <ErrorBox error={error} />
      {loaded && tweets.length === 0 && (
        <p className={`${shared.muted} ${styles.note}`}>
          Seu feed está vazio. Publique algo ou siga alguém: ele mostra os seus pios e os de quem você segue.
        </p>
      )}
      {tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
      <ErrorBox error={moreError ?? undefined} />
      {hasMore && (
        <button className={`${shared.outline} ${styles.more}`} onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
      {ended && (
        <p className={`${shared.muted} ${styles.note}`}>Você chegou ao fim do feed.</p>
      )}
    </section>
  );
}
