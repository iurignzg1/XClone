import { Link, Navigate, useParams } from 'react-router';
import { ErrorBox } from '../../components/ErrorBox';
import { useAuthStore } from '../auth/auth.store';
import { useUiStore } from '../ui/ui.store';
import { ComposePanel } from './ComposePanel';
import { TweetCard } from './TweetCard';
import { TweetSkeletons } from './TweetSkeleton';
import { useTweet } from './useTweet';
import styles from './TweetPage.module.css';
import shared from '../../styles/shared.module.css';

export function TweetPage() {
  // O :id da rota (/pio/:id).
  const { id = '' } = useParams();
  const { tweet, loading, error } = useTweet(id);
  const loggedIn = useAuthStore((s) => s.user !== null);
  const askLogin = useUiStore((s) => s.askLogin);

  return (
    <section className={styles.page}>
      <header className={shared.pageTitle}>
        <Link to="/home" aria-label="Voltar para a home">←</Link>
        <h2>Pio</h2>
      </header>
      {loading && <TweetSkeletons count={1} />}
      <ErrorBox error={error} />
      {tweet && (
        <>
          {tweet.parentId && (
            <p className={styles.note}>
              <Link to={`/pio/${tweet.parentId}`}>↩ Ver o pio respondido</Link>
            </p>
          )}
          <TweetCard tweet={tweet} featured />
          {loggedIn ? (
            <ComposePanel replyTo={tweet.id} />
          ) : (
            <button className={styles.replyPrompt} onClick={() => askLogin('responder')}>
              Entre para responder
            </button>
          )}
          {tweet.replies.length === 0 && <p className={`${shared.muted} ${styles.note}`}>Nenhuma resposta ainda.</p>}
          {/* Aqui todas são respostas ao pio de cima: não precisa repetir "Em resposta a". */}
          {tweet.replies.map((reply) => (
            <TweetCard key={reply.id} tweet={reply} showReplyContext={false} />
          ))}
        </>
      )}
    </section>
  );
}

// O case pede a rota /tweet/:id; no Pio ela se chama /pio/:id. O endereço
// antigo continua funcionando e leva ao novo.
export function TweetRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/pio/${id}`} replace />;
}
