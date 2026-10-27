import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '../ui/ui.store';
import { ComposePanel } from './ComposePanel';
import styles from './ComposerModal.module.css';
import shared from '../../styles/shared.module.css';

// Composer em janela, aberto pelo "Publicar" da barra lateral (de qualquer
// tela). Se aberto/fechado fica no ui.store: é estado só da interface. Fecha
// ao publicar, com Esc ou clicando fora.
export function ComposerModal() {
  const open = useUiStore((s) => s.composerOpen);
  const close = useUiStore((s) => s.closeComposer);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  return createPortal(
    <div className={styles.backdrop} onClick={close}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Novo pio"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <button className={shared.outline} onClick={close}>
            Fechar
          </button>
        </header>
        <ComposePanel autoFocus onPublished={close} />
      </div>
    </div>,
    document.body,
  );
}
