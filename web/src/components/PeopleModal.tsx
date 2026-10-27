import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { FollowButton } from '../features/profile/FollowButton';
import { useAuthStore } from '../features/auth/auth.store';
import { Avatar } from './Avatar';
import { ErrorBox } from './ErrorBox';
import styles from './PeopleModal.module.css';
import shared from '../styles/shared.module.css';

export interface Person {
  id: string;
  username: string;
  displayName: string;
  followedByMe: boolean;
}

// Janela com uma lista de pessoas, cada uma com o botão de seguir (menos a
// própria conta). Serve para "quem curtiu", "seguidores" e "seguindo": quem
// usa faz a query e entrega o resultado. Esc, clique fora ou "Fechar" fecham;
// clicar numa pessoa abre o perfil dela.
export function PeopleModal({
  title,
  people,
  loading,
  error,
  emptyText,
  onClose,
}: {
  title: string;
  people: Person[] | undefined;
  loading: boolean;
  error?: { message: string };
  emptyText: string;
  onClose: () => void;
}) {
  const me = useAuthStore((s) => s.user);
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        // Não deixa o clique subir até quem abriu a janela (ex.: o cartão do pio).
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h3 id={titleId}>{title}</h3>
          <button className={shared.outline} onClick={onClose} autoFocus>
            Fechar
          </button>
        </header>
        <div className={styles.body}>
          {loading && !people && <p className={shared.muted}>Carregando…</p>}
          <ErrorBox error={error} />
          {people?.length === 0 && <p className={shared.muted}>{emptyText}</p>}
          <ul className={styles.list}>
            {people?.map((person) => (
              <li key={person.id} className={styles.person}>
                <Avatar username={person.username} displayName={person.displayName} />
                <Link to={`/${person.username}`} className={styles.names} onClick={onClose}>
                  <strong>{person.displayName}</strong>
                  <span className={shared.muted}>@{person.username}</span>
                </Link>
                {person.id !== me?.id && <FollowButton userId={person.id} followed={person.followedByMe} />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
