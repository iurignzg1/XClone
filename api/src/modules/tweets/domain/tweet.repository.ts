import type { NewTweet, Tweet } from './tweet.entity.js';

export abstract class TweetRepository {
  abstract create(data: NewTweet): Promise<Tweet>;
  abstract findById(id: string): Promise<Tweet | null>;
  // Soma `delta` ao contador de curtidas (atômico, com $inc). Devolve o tweet
  // atualizado, ou null se ele não existe ou se o contador ficaria negativo.
  abstract addLikes(id: string, delta: number): Promise<Tweet | null>;
  // Respostas de um tweet, da mais antiga para a mais nova.
  abstract findReplies(parentId: string, limit: number): Promise<Tweet[]>;
}
