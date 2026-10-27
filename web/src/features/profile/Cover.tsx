import { cx } from '../../lib/cx';
import type { CoverId } from './covers';
import styles from './Cover.module.css';

// Desenha uma capa de perfil. Tudo é CSS (gradientes e ruído em SVG embutido),
// sem imagens para baixar. O tamanho vem de quem usa (className).
export function Cover({ id, className }: { id: CoverId; className?: string }) {
  return <div className={cx(styles.cover, styles[id], className)} aria-hidden="true" />;
}
