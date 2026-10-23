import type { NewTweet, Tweet } from './tweet.entity.js';

export abstract class TweetRepository {
  abstract create(data: NewTweet): Promise<Tweet>;
  abstract findById(id: string): Promise<Tweet | null>;
  // Devolve true se o tweet existia e foi apagado.
  abstract deleteById(id: string): Promise<boolean>;
  // Soma `delta` ao contador de curtidas (atômico, com $inc). Devolve o tweet
  // atualizado, ou null se ele não existe ou se o contador ficaria negativo.
  abstract addLikes(id: string, delta: number): Promise<Tweet | null>;
  // Tweets (sem respostas) de vários autores, do mais novo para o mais antigo.
  abstract findByAuthors(authorIds: string[], limit: number): Promise<Tweet[]>;
  // Respostas de um tweet, da mais antiga para a mais nova.
  abstract findReplies(parentId: string, limit: number): Promise<Tweet[]>;
}
