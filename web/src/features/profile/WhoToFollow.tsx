import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { PersonSkeletons } from '../../components/PersonSkeleton';
import { SuggestedUsersDocument } from '../../gql/graphql';
import { FollowButton } from './FollowButton';
import styles from './WhoToFollow.module.css';
import shared from '../../styles/shared.module.css';

// "Quem seguir": as contas mais seguidas que você ainda não segue. Seguir
// alguém refaz as queries da tela, então a pessoa sai da lista e outra entra.
// É um bloco secundário: se der erro ou não houver sugestão, ele some.
export function WhoToFollow() {
  const { data, loading, error } = useQuery(SuggestedUsersDocument);
  const people = data?.suggestedUsers ?? [];

  if (error || (data && people.length === 0)) return null;
  return (
    <section className={styles.box} aria-labelledby="who-to-follow">
      <h2 id="who-to-follow" className={styles.title}>Quem seguir</h2>
      {loading && !data && <PersonSkeletons />}
      <ul className={styles.list}>
        {people.map((person) => (
          <li key={person.id} className={styles.person}>
            <Avatar username={person.username} displayName={person.displayName} size={40} />
            <Link to={`/${person.username}`} className={styles.names}>
              <strong>{person.displayName}</strong>
              <span className={shared.muted}>@{person.username}</span>
            </Link>
            <FollowButton userId={person.id} followed={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
