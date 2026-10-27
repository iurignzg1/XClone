import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import type { SessionUser } from '../features/auth/auth.store';
import { useLogout } from '../features/auth/useLogout';
import { Avatar } from './Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { LogoutIcon } from './icons';
import styles from './AccountMenu.module.css';
import shared from '../styles/shared.module.css';

type Exit = 'here' | 'everywhere';

// A conta logada na barra lateral: avatar, nome e @, sem cartão em volta; a
// linha leva ao próprio perfil. O ícone de sair abre um menu pequeno com as duas saídas; cada uma ainda pede
// confirmação. Esc ou clique fora fecham o menu.
export function AccountMenu({ user }: { user: SessionUser }) {
  const { endSession, loading } = useLogout();
  const [open, setOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState<Exit | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(exit: Exit) {
    setOpen(false);
    setConfirmExit(exit);
  }

  return (
    <div className={styles.account} ref={rootRef}>
      {/* Clicar no próprio nome abre o seu perfil (substitui o antigo "Meu perfil"). */}
      <NavLink to={`/${user.username}`} end className={styles.profile} title="Ver meu perfil">
        <Avatar username={user.username} displayName={user.displayName} size={40} />
        <span className={styles.who}>
          <strong>{user.displayName}</strong>
          <span className={shared.muted}>
            @{user.username}
            {user.role !== 'USER' && ` · ${user.role}`}
          </span>
        </span>
      </NavLink>
      <button
        ref={triggerRef}
        className={styles.trigger}
        aria-label="Sair da conta"
        title="Sair da conta"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((value) => !value)}
      >
        <LogoutIcon />
      </button>
      {open && (
        <div className={styles.menu} role="menu" aria-label="Sair da conta">
          <button ref={firstItemRef} role="menuitem" onClick={() => choose('here')}>
            Sair
          </button>
          <button role="menuitem" onClick={() => choose('everywhere')}>
            Sair de todos os aparelhos
          </button>
        </div>
      )}
      {confirmExit && (
        <ConfirmDialog
          title={confirmExit === 'here' ? 'Sair do Pio?' : 'Sair de todos os aparelhos?'}
          confirmLabel="Sair"
          onCancel={() => setConfirmExit(null)}
          onConfirm={() => {
            const everywhere = confirmExit === 'everywhere';
            setConfirmExit(null);
            void endSession(everywhere);
          }}
        >
          {confirmExit === 'here'
            ? 'Você vai precisar entrar de novo neste aparelho.'
            : 'Todas as suas sessões serão encerradas, inclusive em outros celulares e computadores.'}
        </ConfirmDialog>
      )}
    </div>
  );
}
