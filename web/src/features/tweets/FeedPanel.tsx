import { useQuery } from '@apollo/client/react';
import { useState, type ReactNode } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import { FeedDocument } from '../../gql/graphql';
import { TweetCard } from './TweetCard';
import { TweetSkeletons } from './TweetSkeleton';
import styles from './FeedPanel.module.css';
import shared from '../../styles/shared.module.css';

const PAGE_SIZE = 20;

// `top` é o que vem logo abaixo do título e antes dos tweets (o composer).
export function FeedPanel({ top }: { top?: ReactNode }) {
  // cache-and-network: mostra o que já tem no cache e busca o novo em seguida.
  const { data, loading, error, refetch, fetchMore } = useQuery(FeedDocument, {
    variables: { limit: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<Error | null>(null);
  // Tamanho da lista quando uma página veio incompleta (= acabaram os tweets).
  // Se a lista mudar de tamanho (ex.: um refetch volta para a primeira página),
  // o botão reaparece.
  const [endedAt, setEndedAt] = useState<number | null>(null);

  const tweets = data?.feed ?? [];
  const hasMore = tweets.length >= PAGE_SIZE && endedAt !== tweets.length;

  async function loadMore() {
    const last = tweets[tweets.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      // O cursor é o id do último tweet que já está na tela. O merge do cache
      // (apollo/client.ts) anexa a página nova ao fim da lista.
      const { data: page } = await fetchMore({ variables: { limit: PAGE_SIZE, after: last.id } });
      const received = page?.feed.length ?? 0;
      if (received < PAGE_SIZE) setEndedAt(tweets.length + received);
    } catch (e) {
      setMoreError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className={styles.feed}>
      <h2 className={styles.heading}>
        Feed <button className={shared.outline} onClick={() => void refetch()}>Atualizar</button>
      </h2>
      {top}
      {loading && !data && <TweetSkeletons />}
      <ErrorBox error={error} />
      {data && tweets.length === 0 && (
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
      {data && tweets.length >= PAGE_SIZE && !hasMore && (
        <p className={`${shared.muted} ${styles.note}`}>Você chegou ao fim do feed.</p>
      )}
    </section>
  );
}
