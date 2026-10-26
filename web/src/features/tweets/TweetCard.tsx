import { useLazyQuery, useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import {
  DeleteTweetDocument,
  FollowUserDocument,
  ToggleLikeDocument,
  TweetLikesDocument,
  UnfollowUserDocument,
  type TweetCardFragment,
} from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from '../auth/auth.store';

// 'active' refaz as queries que estão na tela (feed, perfil...), então qualquer
// mudança aparece sem eu listar quais telas mostram o tweet.
const REFETCH = { refetchQueries: 'active' } as const;

export function TweetCard({ tweet }: { tweet: TweetCardFragment }) {
  const me = useAuthStore((s) => s.user);
  const [showLikes, setShowLikes] = useState(false);

  const [toggleLike, like] = useMutation(ToggleLikeDocument, REFETCH);
  const [deleteTweet, del] = useMutation(DeleteTweetDocument, REFETCH);
  const [follow, followState] = useMutation(FollowUserDocument, REFETCH);
  const [unfollow, unfollowState] = useMutation(UnfollowUserDocument, REFETCH);
  // network-only: a lista de quem curtiu sempre vem fresca do servidor.
  const [loadLikes, likes] = useLazyQuery(TweetLikesDocument, { fetchPolicy: 'network-only' });

  const isMine = me?.id === tweet.author.id;
  const error = like.error ?? del.error ?? followState.error ?? unfollowState.error;

  async function onShowLikes() {
    const next = !showLikes;
    setShowLikes(next);
    if (next) {
      await attempt(() => loadLikes({ variables: { tweetId: tweet.id } }));
    }
  }

  return (
    <article className="card">
      <header>
        <strong>{tweet.author.displayName}</strong> @{tweet.author.username}
        <time> · {new Date(tweet.createdAt).toLocaleString('pt-BR')}</time>
      </header>
      {tweet.parentId && <p className="muted">↩ resposta ao tweet {tweet.parentId}</p>}
      <p className="content">{tweet.content}</p>
      <p className="muted">
        id: <code>{tweet.id}</code>
      </p>

      <div className="actions">
        <button
          onClick={() =>
            void attempt(() => toggleLike({ variables: { input: { tweetId: tweet.id } } }))
          }
          disabled={like.loading}
        >
          {tweet.likedByMe ? '♥ Descurtir' : '♡ Curtir'} ({tweet.likesCount})
        </button>
        <button onClick={() => void onShowLikes()}>
          {showLikes ? 'Esconder quem curtiu' : 'Quem curtiu'}
        </button>
        {!isMine && (
          <>
            <button
              onClick={() =>
                void attempt(() => follow({ variables: { input: { userId: tweet.author.id } } }))
              }
            >
              Seguir autor
            </button>
            <button
              onClick={() =>
                void attempt(() => unfollow({ variables: { input: { userId: tweet.author.id } } }))
              }
            >
              Deixar de seguir
            </button>
          </>
        )}
        {/* Aparece para todos de propósito: assim dá para testar o FORBIDDEN. */}
        <button
          onClick={() =>
            void attempt(() => deleteTweet({ variables: { input: { tweetId: tweet.id } } }))
          }
          disabled={del.loading}
        >
          Apagar
        </button>
      </div>

      {showLikes && (
        <div className="likes">
          {likes.loading && <p className="muted">Carregando…</p>}
          <ErrorBox error={likes.error} />
          {likes.data?.tweetLikes.length === 0 && <p className="muted">Ninguém curtiu ainda.</p>}
          <ul>
            {likes.data?.tweetLikes.map((u) => (
              <li key={u.id}>
                {u.displayName} @{u.username}
                {u.followedByMe && <span className="muted"> · você segue</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ErrorBox error={error} />
    </article>
  );
}
