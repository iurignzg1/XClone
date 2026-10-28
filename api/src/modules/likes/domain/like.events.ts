// Eventos anunciados quando uma curtida é criada ou desfeita. Quem se
// interessa (ex.: as notificações) escuta, sem o módulo de curtidas precisar
// conhecer esses módulos.
export const TWEET_LIKED = 'like.added';
export const TWEET_UNLIKED = 'like.removed';

export interface LikeEvent {
  userId: string;
  tweetId: string;
  tweetAuthorId: string;
}
