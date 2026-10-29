import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { useUiStore } from '../features/ui/ui.store';
import styles from './LoginPrompt.module.css';
import shared from '../styles/shared.module.css';

// Aviso para o visitante que tentou uma ação de quem tem conta (curtir,
// seguir...). Os dois caminhos levam à página atual como origem: depois de
// entrar, a pessoa volta para onde estava.
// Esc, clique fora e "Agora não" fecham; o foco começa em "Entrar" e volta
// para o botão que abriu o aviso.
export function LoginPrompt() {
  const reason = useUiStore((s) => s.loginPrompt);
  const close = useUiStore((s) => s.closeLoginPrompt);
  const location = useLocation();
  const titleId = useId();
  const enterRef = useRef<HTMLAnchorElement>(null);
  const open = reason !== null;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    enterRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open, close]);

  if (!open) return null;
  const state = { from: location };
  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        event.stopPropagation();
        close();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId}>Entre para {reason}</h3>
        <p className={shared.muted}>Com uma conta, você publica, curte, responde e segue pessoas no Pio.</p>
        <div className={styles.buttons}>
          <Link to="/signup" state={state} className={shared.outline} onClick={close}>
            Criar conta
          </Link>
          <Link ref={enterRef} to="/login" state={state} className={shared.primary} onClick={close}>
            Entrar
          </Link>
        </div>
        <button className={styles.dismiss} onClick={close}>
          Agora não
        </button>
      </div>
    </div>,
    document.body,
  );
}
