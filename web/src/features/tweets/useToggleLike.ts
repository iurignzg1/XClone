import { useMutation } from '@apollo/client/react';
import { ToggleLikeDocument, type TweetCardFragment } from '../../gql/graphql';

// Curtir/descurtir com resposta otimista: o coração e o número mudam na hora,
// antes de o servidor responder. Quando a resposta chega, o `update` grava os
// valores reais no pio do cache (o que atualiza o pio em todas as telas que o
// mostram). Se a requisição falhar, o Apollo desfaz a mudança otimista sozinho.
//
// O update é manual porque a resposta da mutation (ToggleLikePayload) não traz
// o id do pio: o Apollo não teria como saber qual pio do cache atualizar.
export function useToggleLike(tweet: Pick<TweetCardFragment, 'id' | 'likedByMe' | 'likesCount'>) {
  const [mutate, { error }] = useMutation(ToggleLikeDocument);

  function toggle() {
    const liked = !tweet.likedByMe;
    return mutate({
      variables: { input: { tweetId: tweet.id } },
      optimisticResponse: {
        __typename: 'Mutation',
        toggleLike: {
          __typename: 'ToggleLikePayload',
          liked,
          likesCount: Math.max(0, tweet.likesCount + (liked ? 1 : -1)),
        },
      },
      update(cache, { data }) {
        if (!data) return;
        cache.modify({
          id: cache.identify({ __typename: 'Tweet', id: tweet.id }),
          fields: {
            likedByMe: () => data.toggleLike.liked,
            likesCount: () => data.toggleLike.likesCount,
          },
        });
      },
    });
  }

  return { toggle, error };
}
