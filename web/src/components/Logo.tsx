import { cx } from '../lib/cx';
import styles from './Logo.module.css';

// A logo tem uma versão para cada tema: a preta aparece no tema claro e a
// branca no escuro. As duas ficam no HTML e o CSS (Logo.module.css) mostra a certa,
// pelo mesmo prefers-color-scheme que troca as cores do resto do app. A que
// está escondida (display: none) não é lida por leitores de tela.
export function Logo() {
  return (
    <>
      <img className={cx(styles.logo, styles.forLight)} src="/logo-preta.svg" alt="Pio" />
      <img className={cx(styles.logo, styles.forDark)} src="/logo-branca.svg" alt="Pio" />
    </>
  );
}
