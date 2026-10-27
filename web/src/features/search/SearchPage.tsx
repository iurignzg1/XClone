import { useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ErrorBox } from '../../components/ErrorBox';
import { SearchIcon } from '../../components/icons';
import { PersonSkeletons } from '../../components/PersonSkeleton';
import { SearchUsersDocument } from '../../gql/graphql';
import styles from './SearchPage.module.css';
import shared from '../../styles/shared.module.css';

// Espera a pessoa parar de digitar antes de buscar, para não mandar uma
// requisição a cada tecla.
const DEBOUNCE_MS = 250;

// Página de pesquisa de pessoas (pelo @ ou pelo nome). O termo fica no endereço
// (/pesquisar?q=ana): voltar, recarregar ou compartilhar o link mantém a busca.
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const term = params.get('q')?.trim() ?? '';
  const [text, setText] = useState(term);

  // Leva o que foi digitado para o endereço, depois da pausa. `replace` evita
  // encher o histórico com uma entrada por letra.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = text.trim();
      if (next !== term) setParams(next ? { q: next } : {}, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, term, setParams]);

  const { data, loading, error } = useQuery(SearchUsersDocument, {
    variables: { query: term },
    skip: term === '',
  });
  const people = term === '' ? [] : (data?.searchUsers ?? []);

  return (
    <section className={styles.page}>
      <header className={styles.top}>
        <h2 className={styles.title}>Pesquisar</h2>
        <label className={styles.field}>
          <SearchIcon />
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Pesquisar pelo @ ou pelo nome"
            aria-label="Pesquisar pessoas"
            maxLength={50}
            autoFocus
          />
        </label>
      </header>

      {term === '' && <p className={`${shared.muted} ${styles.note}`}>Procure pessoas pelo @ ou pelo nome.</p>}
      {term !== '' && loading && !data && (
        <div className={styles.skeleton}>
          <PersonSkeletons />
        </div>
      )}
      <ErrorBox error={error} />
      {term !== '' && data && people.length === 0 && (
        <p className={`${shared.muted} ${styles.note}`}>Ninguém encontrado para “{term}”.</p>
      )}
      <ul className={styles.list}>
        {people.map((person) => (
          <li key={person.id}>
            <Link to={`/${person.username}`} className={styles.person}>
              <Avatar username={person.username} displayName={person.displayName} />
              <span className={styles.names}>
                <strong>{person.displayName}</strong>
                <span className={shared.muted}>@{person.username}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
