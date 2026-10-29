import { useQuery } from '@apollo/client/react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import { LikedTweetsDocument, UserRepliesDocument, UserTweetsDocument } from '../../gql/graphql';
import { useAuthStore } from '../auth/auth.store';
import { TweetCard } from '../tweets/TweetCard';
import { TweetSkeletons } from '../tweets/TweetSkeleton';
import styles from './ProfileTabs.module.css';
import shared from '../../styles/shared.module.css';

const TABS = [
  { id: 'pios', label: 'Pios' },
  { id: 'respostas', label: 'Respostas' },
  { id: 'curtidas', label: 'Curtidas' },
] as const;

type Tab = (typeof TABS)[number]['id'];

// Abas do perfil. As curtidas de uma pessoa só aparecem para quem tem conta.
// Cada aba tem a sua query, e só a da aba aberta roda (skip
// nas outras); voltar para uma aba já vista usa o que está no cache.
// Teclado: setas esquerda/direita trocam de aba, como pede o padrão de abas.
export function ProfileTabs({ username }: { username: string }) {
  const loggedIn = useAuthStore((s) => s.user !== null);
  const tabs = loggedIn ? TABS : TABS.filter((item) => item.id !== 'curtidas');
  const [tab, setTab] = useState<Tab>('pios');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const pios = useQuery(UserTweetsDocument, { variables: { username }, skip: tab !== 'pios' });
  const respostas = useQuery(UserRepliesDocument, { variables: { username }, skip: tab !== 'respostas' });
  const curtidas = useQuery(LikedTweetsDocument, { variables: { username }, skip: tab !== 'curtidas' });

  const current = {
    pios: { tweets: pios.data?.userTweets, loading: pios.loading, error: pios.error, empty: `@${username} ainda não publicou nada.` },
    respostas: { tweets: respostas.data?.userReplies, loading: respostas.loading, error: respostas.error, empty: `@${username} ainda não respondeu ninguém.` },
    curtidas: { tweets: curtidas.data?.likedTweets, loading: curtidas.loading, error: curtidas.error, empty: `@${username} ainda não curtiu nada.` },
  }[tab];

  function onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Conteúdo do perfil">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`${baseId}-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`${baseId}-painel`}
            tabIndex={tab === item.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id={`${baseId}-painel`} role="tabpanel" aria-labelledby={`${baseId}-${tab}`}>
        {current.loading && !current.tweets && <TweetSkeletons />}
        <ErrorBox error={current.error} />
        {current.tweets?.length === 0 && <p className={`${shared.muted} ${styles.empty}`}>{current.empty}</p>}
        {current.tweets?.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
      </div>
    </>
  );
}
