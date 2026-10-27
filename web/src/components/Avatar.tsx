import { hueOf } from '../lib/hue';
import styles from './Avatar.module.css';

// Ainda não existe foto de perfil (upload é bônus): o avatar é a inicial do
// nome sobre uma cor que sai do @usuário, então cada pessoa tem sempre a
// mesma. O site é preto e branco: a cor fica só no avatar e na capa.
export function Avatar({
  username,
  displayName,
  size = 44,
}: {
  username: string;
  displayName: string;
  size?: number;
}) {
  return (
    <span
      className={styles.avatar}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hueOf(username)} 55% 42%)`,
      }}
    >
      {displayName.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
