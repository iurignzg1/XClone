import { useQuery } from '@apollo/client/react';
import { ErrorBox } from '../../components/ErrorBox';
import { TopTweetsDocument } from '../../gql/graphql';
import { TweetCard } from './TweetCard';
import { TweetSkeletons } from './TweetSkeleton';
import styles from './FeedPanel.module.css';
import guest from './GuestHome.module.css';
import shared from '../../styles/shared.module.css';

const TOP_LIMIT = 20;

// Página inicial de quem não tem conta: os pios mais curtidos. Ler é livre;
// curtir, responder, publicar e seguir pedem login (o TweetCard abre o aviso).
// Os botões de Entrar e Criar conta ficam só no menu lateral, para não repetir.
export function GuestHome() {
  const { data, loading, error } = useQuery(TopTweetsDocument, { variables: { limit: TOP_LIMIT } });
  const tweets = data?.topTweets;

  return (
    <section className={styles.feed}>
      <h2 className={styles.heading}>Em alta</h2>
      <div className={guest.intro}>
        <h3>Veja o que está acontecendo</h3>
        <p className={shared.muted}>Os pios mais curtidos do Pio. Crie uma conta para publicar, curtir e seguir pessoas.</p>
      </div>
      {loading && !tweets && <TweetSkeletons />}
      <ErrorBox error={error} />
      {tweets?.length === 0 && (
        <p className={`${shared.muted} ${styles.note}`}>Ainda não há pios. Seja a primeira pessoa a publicar: crie sua conta.</p>
      )}
      {tweets?.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
    </section>
  );
}
