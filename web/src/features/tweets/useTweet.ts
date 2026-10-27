import { useQuery } from '@apollo/client/react';
import { TweetDocument } from '../../gql/graphql';

// Um pio com as respostas (tela de detalhe).
export function useTweet(id: string) {
  // cache-and-network: mostra o que já tem no cache e busca o novo em seguida.
  const { data, loading, error } = useQuery(TweetDocument, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  return { tweet: data?.tweet, loading: loading && !data, error };
}
