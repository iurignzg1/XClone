import { useQuery } from '@apollo/client/react';
import { Link, useParams } from 'react-router';
import { ErrorBox } from '../../components/ErrorBox';
import { TweetDocument } from '../../gql/graphql';
import { ComposePanel } from './ComposePanel';
import { TweetCard } from './TweetCard';
import { TweetSkeletons } from './TweetSkeleton';
import styles from './TweetPage.module.css';
import shared from '../../styles/shared.module.css';

export function TweetPage() {
  // O :id da rota (/pio/:id).
  const { id = '' } = useParams();
  const { data, loading, error } = useQuery(TweetDocument, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const tweet = data?.tweet;

  return (
    <section className={styles.page}>
      <header className={shared.pageTitle}>
        <Link to="/home" aria-label="Voltar para a home">←</Link>
        <h2>Pio</h2>
      </header>
      {loading && !data && <TweetSkeletons count={1} />}
      <ErrorBox error={error} />
      {tweet && (
        <>
          {tweet.parentId && (
            <p className={styles.note}>
              <Link to={`/pio/${tweet.parentId}`}>↩ Ver o pio respondido</Link>
            </p>
          )}
          <TweetCard tweet={tweet} featured />
          <ComposePanel replyTo={tweet.id} />
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
