import { useMutation, useQuery } from '@apollo/client/react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ErrorBox } from '../../components/ErrorBox';
import { HeartIcon, ReplyIcon, UserPlusIcon } from '../../components/icons';
import { PersonSkeletons } from '../../components/PersonSkeleton';
import {
  MarkNotificationsReadDocument,
  NotificationsDocument,
  UnreadNotificationsCountDocument,
  type NotificationsQuery,
} from '../../gql/graphql';
import { timeAgo } from '../../lib/time';
import styles from './NotificationsPage.module.css';
import shared from '../../styles/shared.module.css';

type Notification = NotificationsQuery['notifications'][number];

// Quem curtiu, respondeu ou começou a seguir. As curtidas do mesmo pio chegam
// juntas numa linha só (a API agrupa).
export function NotificationsPage() {
  const { data, loading, error } = useQuery(NotificationsDocument, { fetchPolicy: 'cache-and-network' });
  const [markRead] = useMutation(MarkNotificationsReadDocument, {
    // O sino do menu zera na hora, sem esperar a próxima consulta dele.
    update: (cache) =>
      cache.writeQuery({ query: UnreadNotificationsCountDocument, data: { __typename: 'Query', unreadNotificationsCount: 0 } }),
  });
  const notifications = data?.notifications;

  // Abrir a página conta como "vi tudo". As linhas novas continuam marcadas
  // nesta visita, para dar tempo de ver quais eram.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !notifications?.some((n) => !n.read)) return;
    marked.current = true;
    markRead().catch(() => undefined);
  }, [notifications, markRead]);

  return (
    <section className={styles.page}>
      <header className={shared.pageTitle}>
        <Link to="/home" aria-label="Voltar para a home">←</Link>
        <h2>Notificações</h2>
      </header>

      {loading && !notifications && (
        <div className={styles.padded}>
          <PersonSkeletons />
        </div>
      )}
      <ErrorBox error={error} />
      {notifications?.length === 0 && (
        <p className={`${shared.muted} ${styles.empty}`}>
          Nada por aqui ainda. Quando alguém curtir, responder ou seguir você, aparece aqui.
        </p>
      )}
      <ul className={styles.list}>
        {notifications?.map((notification) => (
          <li key={notification.id}>
            <NotificationRow notification={notification} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const { type, actors, tweet, read, createdAt } = notification;
  const first = actors[0];
  // Seguir leva ao perfil de quem seguiu; o resto, ao pio.
  const to = type === 'FOLLOW' || !tweet ? `/${first?.username ?? ''}` : `/pio/${tweet.id}`;

  return (
    <Link to={to} className={`${styles.row} ${read ? '' : styles.unread}`}>
      <span className={styles.icon}>{iconOf(type)}</span>
      <div className={styles.body}>
        <div className={styles.avatars}>
          {actors.map((actor) => (
            <Avatar key={actor.id} username={actor.username} displayName={actor.displayName} size={32} />
          ))}
        </div>
        <p className={styles.text}>
          {describe(notification)}
          <span className={shared.muted}> · {timeAgo(createdAt)}</span>
          {!read && <span className={styles.dot} role="img" aria-label="nova" />}
        </p>
        {tweet && <p className={`${shared.muted} ${styles.snippet}`}>{tweet.content}</p>}
      </div>
    </Link>
  );
}

function iconOf(type: Notification['type']) {
  if (type === 'LIKE') return <HeartIcon filled />;
  if (type === 'REPLY') return <ReplyIcon />;
  return <UserPlusIcon />;
}

// "Ana curtiu seu pio", "Ana e Bia curtiram seu pio",
// "Ana e mais 4 pessoas curtiram seu pio".
function describe({ type, actors, actorsCount }: Notification) {
  const [first, second] = actors;
  const name = <strong>{first?.displayName ?? 'Alguém'}</strong>;
  if (type === 'REPLY') return <>{name} respondeu seu pio</>;
  if (type === 'FOLLOW') return <>{name} começou a seguir você</>;
  if (actorsCount === 1) return <>{name} curtiu seu pio</>;
  if (actorsCount === 2 && second) {
    return <>{name} e <strong>{second.displayName}</strong> curtiram seu pio</>;
  }
  const others = actorsCount - 1;
  return <>{name} e mais {others} {others === 1 ? 'pessoa' : 'pessoas'} curtiram seu pio</>;
}
