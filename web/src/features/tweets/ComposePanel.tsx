import { useMutation } from '@apollo/client/react';
import { useState, type FormEvent } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import { CreateTweetDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';

export function ComposePanel() {
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState('');
  const [createTweet, { loading, error }] = useMutation(CreateTweetDocument, {
    refetchQueries: 'active',
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await attempt(() =>
      createTweet({
        variables: { input: { content, parentId: parentId.trim() || undefined } },
      }),
    );
    if (ok) setContent('');
  }

  return (
    <section>
      <h2>Publicar</h2>
      <form onSubmit={(e) => void onSubmit(e)}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está acontecendo?"
          rows={3}
        />
        <p className="muted">{content.trim().length}/280</p>
        <input
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          placeholder="(opcional) id do tweet respondido"
        />
        <button disabled={loading}>{loading ? 'Publicando…' : 'Publicar'}</button>
        <ErrorBox error={error} />
      </form>
    </section>
  );
}
