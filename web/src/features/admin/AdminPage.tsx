import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ErrorBox } from '../../components/ErrorBox';
import { PersonSkeletons } from '../../components/PersonSkeleton';
import { SuspendedUsersDocument } from '../../gql/graphql';
import { ReactivateButton } from './ReactivateButton';
import styles from './AdminPage.module.css';
import shared from '../../styles/shared.module.css';

// Área só para ADMIN (a rota é protegida por papel e a API também confere).
// Lista as contas suspensas, com a opção de reativar cada uma. Suspender
// continua sendo feito no perfil de cada pessoa.
export function AdminPage() {
  // network-only: a lista sempre vem fresca (outro admin pode ter mexido).
  const { data, loading, error } = useQuery(SuspendedUsersDocument, { fetchPolicy: 'network-only' });
  const people = data?.suspendedUsers;

  return (
    <section className={styles.page}>
      <header className={shared.pageTitle}>
        <Link to="/home" aria-label="Voltar para a home">←</Link>
        <h2>Administração</h2>
      </header>

      <div className={styles.intro}>
        <h3>Contas suspensas</h3>
        <p className={shared.muted}>
          Quem está aqui não consegue entrar no Pio. Para suspender alguém, abra o perfil da pessoa.
        </p>
      </div>

      {loading && !people && (
        <div className={styles.padded}>
          <PersonSkeletons />
        </div>
      )}
      <ErrorBox error={error} />
      {people?.length === 0 && <p className={`${shared.muted} ${styles.empty}`}>Nenhuma conta suspensa.</p>}
      <ul className={styles.list}>
        {people?.map((person) => (
          <li key={person.id} className={styles.person}>
            <Avatar username={person.username} displayName={person.displayName} />
            <Link to={`/${person.username}`} className={styles.names}>
              <strong>{person.displayName}</strong>
              <span className={shared.muted}>@{person.username}</span>
            </Link>
            <ReactivateButton userId={person.id} username={person.username} />
          </li>
        ))}
      </ul>
    </section>
  );
}
