import { useMutation, useQuery } from '@apollo/client/react';
import { useState, type FormEvent } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import {
  FollowUserDocument,
  SuspendUserDocument,
  UnfollowUserDocument,
  UserByUsernameDocument,
  UserTweetsDocument,
} from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from '../auth/auth.store';
import { TweetCard } from '../tweets/TweetCard';

const REFETCH = { refetchQueries: 'active' } as const;

export function ProfilePanel() {
  const me = useAuthStore((s) => s.user);
  const [typed, setTyped] = useState('');
  const [username, setUsername] = useState('');

  const profile = useQuery(UserByUsernameDocument, {
    variables: { username },
    skip: !username,
  });
  const tweets = useQuery(UserTweetsDocument, {
    variables: { username },
    skip: !username,
  });
  const [follow, followState] = useMutation(FollowUserDocument, REFETCH);
  const [unfollow, unfollowState] = useMutation(UnfollowUserDocument, REFETCH);
  const [suspend, suspendState] = useMutation(SuspendUserDocument, REFETCH);

  const user = profile.data?.userByUsername;
  const isMe = user?.id === me?.id;
  const actionError = followState.error ?? unfollowState.error ?? suspendState.error;

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setUsername(typed.trim());
  }

  return (
    <section>
      <h2>Perfil</h2>
      <form onSubmit={onSearch} className="inline">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="usuário (sem @)"
        />
        <button>Buscar</button>
        <button
          type="button"
          onClick={() => {
            setTyped(me?.username ?? '');
            setUsername(me?.username ?? '');
          }}
        >
          Meu perfil
        </button>
      </form>

      {profile.loading && <p className="muted">Carregando…</p>}
      <ErrorBox error={profile.error} />

      {user && (
        <div className="card">
          <p>
            <strong>{user.displayName}</strong> @{user.username} · <code>{user.role}</code>
            {user.suspended && <strong className="error"> · CONTA SUSPENSA</strong>}
          </p>
          {user.bio && <p>{user.bio}</p>}
          <p className="muted">
            {user.followersCount} seguidores · seguindo {user.followingCount}
            {!isMe && user.followedByMe && ' · você segue'}
          </p>
          {!isMe && (
            <div className="actions">
              {user.followedByMe ? (
                <button onClick={() => void attempt(() => unfollow({ variables: { input: { userId: user.id } } }))}>
                  Deixar de seguir
                </button>
              ) : (
                <button onClick={() => void attempt(() => follow({ variables: { input: { userId: user.id } } }))}>
                  Seguir
                </button>
              )}
              {/* Aparece para todos de propósito: assim dá para testar o FORBIDDEN. */}
              <button onClick={() => void attempt(() => suspend({ variables: { input: { userId: user.id } } }))}>
                Suspender conta (ADMIN)
              </button>
            </div>
          )}
          <ErrorBox error={actionError} />
        </div>
      )}

      {user && <h3>Tweets de @{user.username}</h3>}
      <ErrorBox error={tweets.error} />
      {tweets.data?.userTweets.length === 0 && <p className="muted">Nenhum tweet ainda.</p>}
      {tweets.data?.userTweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
    </section>
  );
}
