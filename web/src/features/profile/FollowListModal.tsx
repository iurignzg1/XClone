import { useQuery } from '@apollo/client/react';
import { PeopleModal } from '../../components/PeopleModal';
import { FollowersDocument, FollowingDocument } from '../../gql/graphql';

export type FollowList = 'followers' | 'following';

// Janela com os seguidores de um perfil ou com quem ele segue. As duas queries
// ficam declaradas, mas só a da lista aberta roda (skip na outra).
export function FollowListModal({
  username,
  list,
  onClose,
}: {
  username: string;
  list: FollowList;
  onClose: () => void;
}) {
  // network-only: a lista sempre vem fresca (seguir alguém muda as duas).
  const followers = useQuery(FollowersDocument, {
    variables: { username },
    skip: list !== 'followers',
    fetchPolicy: 'network-only',
  });
  const following = useQuery(FollowingDocument, {
    variables: { username },
    skip: list !== 'following',
    fetchPolicy: 'network-only',
  });

  return list === 'followers' ? (
    <PeopleModal
      title="Seguidores"
      people={followers.data?.followers}
      loading={followers.loading}
      error={followers.error}
      emptyText={`Ninguém segue @${username} ainda.`}
      onClose={onClose}
    />
  ) : (
    <PeopleModal
      title="Seguindo"
      people={following.data?.following}
      loading={following.loading}
      error={following.error}
      emptyText={`@${username} ainda não segue ninguém.`}
      onClose={onClose}
    />
  );
}
