import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmDialog.module.css';
import shared from '../styles/shared.module.css';

// Pergunta "tem certeza?" antes de uma ação séria (apagar, sair, suspender).
// O foco começa no Cancelar, para um Enter distraído não confirmar nada; Esc e
// clique fora também cancelam. Ao fechar, o foco volta para o botão que abriu.
// Fica num portal no <body> para não herdar estilos nem cliques de onde foi
// aberta (ex.: o cartão do pio, que abre o detalhe ao ser clicado).
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const textId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [onCancel]);

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId}>{title}</h3>
        <p id={textId} className={shared.muted}>
          {children}
        </p>
        <div className={styles.buttons}>
          <button ref={cancelRef} className={shared.outline} onClick={onCancel}>
            Cancelar
          </button>
          <button className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
