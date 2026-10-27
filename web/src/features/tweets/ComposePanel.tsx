import { useMutation } from '@apollo/client/react';
import { useState, type FormEvent } from 'react';
import { Avatar } from '../../components/Avatar';
import { ErrorBox } from '../../components/ErrorBox';
import { CreateTweetDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from '../auth/auth.store';
import styles from './ComposePanel.module.css';
import shared from '../../styles/shared.module.css';

const MAX = 280;

// Com `replyTo`, publica uma resposta a esse pio. `onPublished` avisa quem
// abriu o composer (ex.: o modal, que fecha depois de publicar).
export function ComposePanel({
  replyTo,
  autoFocus = false,
  onPublished,
}: {
  replyTo?: string;
  autoFocus?: boolean;
  onPublished?: () => void;
}) {
  const me = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [createTweet, { loading, error }] = useMutation(CreateTweetDocument, {
    refetchQueries: 'active',
  });

  const length = content.trim().length;
  const label = replyTo ? 'Responder' : 'Publicar';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await attempt(() =>
      createTweet({ variables: { input: { content, parentId: replyTo } } }),
    );
    if (ok) {
      setContent('');
      onPublished?.();
    }
  }

  return (
    <form className={styles.compose} onSubmit={(e) => void onSubmit(e)}>
      {me && <Avatar username={me.username} displayName={me.displayName} />}
      <div className={styles.fields}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyTo ? 'Publique sua resposta' : 'O que está acontecendo?'}
          aria-label={replyTo ? 'Sua resposta' : 'Novo pio'}
          rows={2}
          autoFocus={autoFocus}
        />
        <div className={styles.footer}>
          <span className={length > MAX ? shared.error : shared.muted}>{length}/{MAX}</span>
          <button className={shared.primary} disabled={loading || length === 0 || length > MAX}>
            {loading ? 'Enviando…' : label}
          </button>
        </div>
        <ErrorBox error={error} />
      </div>
    </form>
  );
}
