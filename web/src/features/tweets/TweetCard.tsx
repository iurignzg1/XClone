import { useMutation } from '@apollo/client/react';
import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorBox } from '../../components/ErrorBox';
import { HeartIcon, ReplyIcon, TrashIcon, UsersIcon } from '../../components/icons';
import { DeleteTweetDocument, ToggleLikeDocument, type TweetCardFragment } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { timeAgo } from '../../lib/time';
import { useAuthStore } from '../auth/auth.store';
import { LikesModal } from './LikesModal';
import styles from './TweetCard.module.css';
import shared from '../../styles/shared.module.css';

// 'active' refaz as queries que estão na tela (feed, perfil...), então qualquer
// mudança aparece sem eu listar quais telas mostram o tweet.
const REFETCH = { refetchQueries: 'active' } as const;

// `featured` é o pio em destaque do detalhe: texto maior e data completa.
// `showReplyContext` mostra o "Em resposta a" (escondido nas respostas do detalhe).
export function TweetCard({
  tweet,
  featured = false,
  showReplyContext = true,
}: {
  tweet: TweetCardFragment;
  featured?: boolean;
  showReplyContext?: boolean;
}) {
  const me = useAuthStore((s) => s.user);
  const [showLikes, setShowLikes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

  const [toggleLike, like] = useMutation(ToggleLikeDocument, REFETCH);
  const [deleteTweet, del] = useMutation(DeleteTweetDocument, REFETCH);

  // Pela matriz de permissões: o autor apaga o próprio; moderador e admin, qualquer um.
  const canDelete = me?.id === tweet.author.id || me?.role === 'MODERATOR' || me?.role === 'ADMIN';
  const error = like.error ?? del.error;
  const created = new Date(tweet.createdAt);

  // Clicar no cartão abre o pio com as respostas. Cliques em links e botões
  // fazem a sua própria ação, e selecionar texto com o mouse não conta.
  function openTweet(event: MouseEvent<HTMLElement>) {
    if (featured) return;
    if ((event.target as HTMLElement).closest('a, button, textarea, input')) return;
    if (window.getSelection()?.toString()) return;
    void navigate(`/pio/${tweet.id}`);
  }

  return (
    // O cartão inteiro é clicável só para o mouse; para teclado e leitores de
    // tela, o link da data e o "Responder" já levam ao mesmo lugar.
    <article className={`${styles.card} ${featured ? '' : styles.clickable} ${featured ? styles.featured : ''}`} onClick={openTweet}>
      <Link to={`/${tweet.author.username}`} aria-hidden="true" tabIndex={-1}>
        <Avatar username={tweet.author.username} displayName={tweet.author.displayName} size={featured ? 52 : 44} />
      </Link>
      <div className={styles.body}>
        <header className={styles.header}>
          <Link to={`/${tweet.author.username}`} className={styles.author}>
            <strong>{tweet.author.displayName}</strong>
            <span className={shared.muted}>@{tweet.author.username}</span>
          </Link>
          <Link to={`/pio/${tweet.id}`} className={`${shared.muted} ${styles.time}`}>
            · <time dateTime={tweet.createdAt} title={created.toLocaleString('pt-BR')}>
              {featured ? created.toLocaleString('pt-BR') : timeAgo(tweet.createdAt)}
            </time>
          </Link>
        </header>
        {tweet.parentId && showReplyContext && (
          <p className={shared.muted}>
            Em resposta a <Link to={`/pio/${tweet.parentId}`}>outro pio</Link>
          </p>
        )}
        <p className={styles.content}>{tweet.content}</p>

        <div className={styles.actions}>
          <Link
            to={`/pio/${tweet.id}`}
            className={styles.action}
            aria-label={`Responder (${tweet.repliesCount})`}
          >
            <ReplyIcon />
            <span>{tweet.repliesCount}</span>
          </Link>
          <button
            className={`${styles.action} ${tweet.likedByMe ? styles.liked : ''}`}
            aria-label={`${tweet.likedByMe ? 'Descurtir' : 'Curtir'} (${tweet.likesCount})`}
            aria-pressed={tweet.likedByMe}
            disabled={like.loading}
            onClick={() => void attempt(() => toggleLike({ variables: { input: { tweetId: tweet.id } } }))}
          >
            <HeartIcon filled={tweet.likedByMe} />
            <span>{tweet.likesCount}</span>
          </button>
          <button className={styles.action} onClick={() => setShowLikes(true)} aria-label="Quem curtiu">
            <UsersIcon />
            <span className={styles.label}>Quem curtiu</span>
          </button>
          {canDelete && (
            <button
              className={`${styles.action} ${styles.delete}`}
              aria-label="Apagar"
              disabled={del.loading}
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon />
              <span className={styles.label}>Apagar</span>
            </button>
          )}
        </div>
        <ErrorBox error={error} />
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Apagar pio?"
          confirmLabel="Apagar"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            void attempt(() => deleteTweet({ variables: { input: { tweetId: tweet.id } } }));
          }}
        >
          Ele some do perfil e do feed, junto com as curtidas. Não dá para desfazer.
        </ConfirmDialog>
      )}
      {showLikes && <LikesModal tweetId={tweet.id} onClose={() => setShowLikes(false)} />}
    </article>
  );
}
