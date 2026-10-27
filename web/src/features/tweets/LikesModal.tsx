import { useQuery } from '@apollo/client/react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ErrorBox } from '../../components/ErrorBox';
import { TweetLikesDocument } from '../../gql/graphql';
import { useAuthStore } from '../auth/auth.store';
import { FollowButton } from '../profile/FollowButton';
import styles from './LikesModal.module.css';
import shared from '../../styles/shared.module.css';

// Janela com quem curtiu o tweet, cada um com o botão de seguir.
export function LikesModal({ tweetId, onClose }: { tweetId: string; onClose: () => void }) {
  const me = useAuthStore((s) => s.user);
  // network-only: a lista de quem curtiu sempre vem fresca do servidor.
  const { data, loading, error } = useQuery(TweetLikesDocument, {
    variables: { tweetId },
    fetchPolicy: 'network-only',
  });

  // Esc fecha a janela.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        // Não deixa o clique subir até o cartão do pio (que abriria o detalhe).
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="likes-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h3 id="likes-title">Curtido por</h3>
          <button className={shared.outline} onClick={onClose} autoFocus>
            Fechar
          </button>
        </header>
        <div className={styles.body}>
          {loading && !data && <p className={shared.muted}>Carregando…</p>}
          <ErrorBox error={error} />
          {data?.tweetLikes.length === 0 && <p className={shared.muted}>Ninguém curtiu ainda.</p>}
          <ul className={styles.list}>
            {data?.tweetLikes.map((user) => (
              <li key={user.id} className={styles.person}>
                <Avatar username={user.username} displayName={user.displayName} />
                <Link to={`/${user.username}`} className={styles.names} onClick={onClose}>
                  <strong>{user.displayName}</strong>
                  <span className={shared.muted}>@{user.username}</span>
                </Link>
                {user.id !== me?.id && <FollowButton userId={user.id} followed={user.followedByMe} />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
