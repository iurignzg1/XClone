import { useMutation } from '@apollo/client/react';
import { ErrorBox } from '../../components/ErrorBox';
import { FollowUserDocument, UnfollowUserDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import shared from '../../styles/shared.module.css';

// Seguir / Seguindo. 'active' refaz as queries na tela, então contadores e
// botões de outros lugares (perfil, lista de curtidas) se atualizam juntos.
export function FollowButton({ userId, followed }: { userId: string; followed: boolean }) {
  const [follow, followState] = useMutation(FollowUserDocument, { refetchQueries: 'active' });
  const [unfollow, unfollowState] = useMutation(UnfollowUserDocument, { refetchQueries: 'active' });
  const busy = followState.loading || unfollowState.loading;
  const error = followState.error ?? unfollowState.error;

  return (
    <>
      <button
        className={followed ? shared.outline : shared.primary}
        disabled={busy}
        aria-pressed={followed}
        onClick={() =>
          void attempt(() =>
            followed
              ? unfollow({ variables: { input: { userId } } })
              : follow({ variables: { input: { userId } } }),
          )
        }
      >
        {followed ? 'Seguindo' : 'Seguir'}
      </button>
      <ErrorBox error={error} />
    </>
  );
}
