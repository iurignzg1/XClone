import styles from './TweetSkeleton.module.css';

// Esqueleto de carregamento: o formato de alguns tweets em cinza pulsando.
export function TweetSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando pios" role="status">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.row}>
          <span className={`${styles.block} ${styles.avatar}`} />
          <div className={styles.lines}>
            <span className={`${styles.block} ${styles.short}`} />
            <span className={styles.block} />
            <span className={`${styles.block} ${styles.medium}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
