import { useQuery } from '@apollo/client/react';
import { PeopleModal } from '../../components/PeopleModal';
import { TweetLikesDocument } from '../../gql/graphql';

// Janela com quem curtiu o pio.
export function LikesModal({ tweetId, onClose }: { tweetId: string; onClose: () => void }) {
  // network-only: a lista de quem curtiu sempre vem fresca do servidor.
  const { data, loading, error } = useQuery(TweetLikesDocument, {
    variables: { tweetId },
    fetchPolicy: 'network-only',
  });

  return (
    <PeopleModal
      title="Curtido por"
      people={data?.tweetLikes}
      loading={loading}
      error={error}
      emptyText="Ninguém curtiu ainda."
      onClose={onClose}
    />
  );
}
