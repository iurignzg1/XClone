// Evento anunciado quando um tweet é apagado. Quem cuida de dados ligados ao
// tweet (ex.: as curtidas) escuta este evento, sem o módulo de tweets precisar
// conhecer esses módulos.
export const TWEET_DELETED = 'tweet.deleted';

export interface TweetDeletedEvent {
  tweetId: string;
}
