import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { FeedDocument } from '../../gql/graphql';

const PAGE_SIZE = 20;

// O feed com a paginação por cursor: a primeira página, o "carregar mais" e
// se ainda há pios para buscar. A tela (FeedPanel) só desenha o que volta daqui.
export function useFeed() {
  // cache-and-network: mostra o que já tem no cache e busca o novo em seguida.
  const { data, loading, error, refetch, fetchMore } = useQuery(FeedDocument, {
    variables: { limit: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<Error | null>(null);
  // Tamanho da lista quando uma página veio incompleta (= acabaram os pios).
  // Se a lista mudar de tamanho (ex.: um refetch volta para a primeira página),
  // o "carregar mais" reaparece.
  const [endedAt, setEndedAt] = useState<number | null>(null);

  const tweets = data?.feed ?? [];
  const hasMore = tweets.length >= PAGE_SIZE && endedAt !== tweets.length;
  const ended = data !== undefined && tweets.length >= PAGE_SIZE && !hasMore;

  async function loadMore() {
    const last = tweets[tweets.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      // O cursor é o id do último pio que já está na tela. O merge do cache
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

  return {
    tweets,
    loaded: data !== undefined,
    loading: loading && !data,
    error,
    refetch,
    loadMore,
    loadingMore,
    moreError,
    hasMore,
    ended,
  };
}
