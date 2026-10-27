import styles from './PersonSkeleton.module.css';

// Esqueleto de carregamento de uma lista de pessoas: avatar e duas linhas.
export function PersonSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando pessoas">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.row}>
          <span className={`${styles.block} ${styles.avatar}`} />
          <span className={styles.lines}>
            <span className={`${styles.block} ${styles.name}`} />
            <span className={`${styles.block} ${styles.handle}`} />
          </span>
        </div>
      ))}
    </div>
  );
}
