import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorBox } from '../../components/ErrorBox';
import { SuspendUserDocument, UserByUsernameDocument, UserTweetsDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from '../auth/auth.store';
import { TweetCard } from '../tweets/TweetCard';
import { TweetSkeletons } from '../tweets/TweetSkeleton';
import { Cover } from './Cover';
import { toCoverId, type CoverId } from './covers';
import { EditProfileForm } from './EditProfileForm';
import { FollowButton } from './FollowButton';
import styles from './ProfilePage.module.css';
import shared from '../../styles/shared.module.css';

export function ProfilePage() {
  const me = useAuthStore((s) => s.user);
  // O :username da rota (/:username).
  const { username = '' } = useParams();

  const profile = useQuery(UserByUsernameDocument, { variables: { username } });
  const tweets = useQuery(UserTweetsDocument, { variables: { username } });
  const [editing, setEditing] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  // Capa escolhida no formulário, ainda não salva: aparece no topo como prévia.
  const [previewCover, setPreviewCover] = useState<CoverId | null>(null);
  const [suspend, suspendState] = useMutation(SuspendUserDocument, { refetchQueries: 'active' });

  const user = profile.data?.userByUsername;
  const isMe = user?.id === me?.id;

  return (
    <section className={styles.page}>
      <header className={shared.pageTitle}>
        <Link to="/home" aria-label="Voltar para a home">←</Link>
        <h2>{user ? user.displayName : 'Perfil'}</h2>
      </header>
      {profile.loading && !user && <TweetSkeletons count={1} />}
      <ErrorBox error={profile.error} />

      {user && (
        <section className={styles.card}>
          <Cover id={editing && previewCover ? previewCover : toCoverId(user.cover)} className={styles.coverBand} />
          {editing ? (
            <EditProfileForm
              current={{ displayName: user.displayName, bio: user.bio, cover: toCoverId(user.cover) }}
              onPreviewCover={setPreviewCover}
              onDone={() => {
                setEditing(false);
                setPreviewCover(null);
              }}
            />
          ) : (
            <>
              <div className={styles.identity}>
                <span className={styles.avatarRing}>
                  <Avatar username={user.username} displayName={user.displayName} size={88} />
                </span>
                <div className={styles.names}>
                  <div className={styles.head}>
                    <h3 className={styles.name}>{user.displayName}</h3>
                    <span className={styles.handle}>@{user.username}</span>
                  </div>
                  {/* Usuário comum não leva selo: só ADMIN e MODERATOR (e o aviso de conta suspensa). */}
                  {(user.role !== 'USER' || user.suspended) && (
                    <p className={styles.badges}>
                      {user.role !== 'USER' && <span className={styles.badge}>{user.role}</span>}
                      {user.suspended && <span className={`${styles.badge} ${styles.suspended}`}>conta suspensa</span>}
                    </p>
                  )}
                </div>
              </div>
              {user.bio && <p className={styles.bio}>{user.bio}</p>}
            </>
          )}

          <dl className={styles.stats}>
            <div><dd>{user.followingCount}</dd><dt>seguindo</dt></div>
            <div><dd>{user.followersCount}</dd><dt>seguidores</dt></div>
          </dl>

          {!editing && (
            <div className={styles.buttons}>
              {isMe && (
                <button className={shared.outline} onClick={() => setEditing(true)}>
                  Editar perfil
                </button>
              )}
              {!isMe && <FollowButton userId={user.id} followed={user.followedByMe} />}
              {me?.role === 'ADMIN' && !isMe && !user.suspended && (
                <button
                  className={`${shared.outline} ${shared.danger}`}
                  disabled={suspendState.loading}
                  onClick={() => setConfirmSuspend(true)}
                >
                  Suspender conta
                </button>
              )}
            </div>
          )}
          <ErrorBox error={suspendState.error} />
          {confirmSuspend && (
            <ConfirmDialog
              title={`Suspender @${user.username}?`}
              confirmLabel="Suspender"
              onCancel={() => setConfirmSuspend(false)}
              onConfirm={() => {
                setConfirmSuspend(false);
                void attempt(() => suspend({ variables: { input: { userId: user.id } } }));
              }}
            >
              A pessoa perde o acesso na hora e não consegue mais entrar.
            </ConfirmDialog>
          )}
        </section>
      )}

      {user && (
        <h3 className={styles.listTitle}>
          Pios de {user.displayName}
        </h3>
      )}
      {user && tweets.loading && !tweets.data && <TweetSkeletons />}
      <ErrorBox error={tweets.error} />
      {tweets.data?.userTweets.length === 0 && (
        <p className={`${shared.muted} ${styles.empty}`}>@{username} ainda não publicou nada.</p>
      )}
      {tweets.data?.userTweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
    </section>
  );
}
