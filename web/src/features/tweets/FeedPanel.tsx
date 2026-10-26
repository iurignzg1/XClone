import { useQuery } from '@apollo/client/react';
import { ErrorBox } from '../../components/ErrorBox';
import { FeedDocument } from '../../gql/graphql';
import { TweetCard } from './TweetCard';

export function FeedPanel() {
  // cache-and-network: mostra o que já tem no cache e busca o novo em seguida.
  const { data, loading, error, refetch } = useQuery(FeedDocument, {
    variables: { limit: 20 },
    fetchPolicy: 'cache-and-network',
  });

  return (
    <section>
      <h2>
        Feed <button onClick={() => void refetch()}>Atualizar</button>
      </h2>
      {loading && !data && <p className="muted">Carregando…</p>}
      <ErrorBox error={error} />
      {data?.feed.length === 0 && (
        <p className="muted">
          Feed vazio. Publique algo ou siga alguém (o feed mostra os seus tweets e os de quem você segue).
        </p>
      )}
      {data?.feed.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
    </section>
  );
}
