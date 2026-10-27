import { LikeRepository } from '../domain/like.repository.js';

// Repositório de curtidas em memória, só para os testes (não vai para o build).

export class InMemoryLikeRepository extends LikeRepository {
  likes = new Set<string>();

  add(userId: string, tweetId: string): Promise<boolean> {
    const key = `${userId}:${tweetId}`;
    const isNew = !this.likes.has(key);
    this.likes.add(key);
    return Promise.resolve(isNew);
  }

  remove(userId: string, tweetId: string): Promise<boolean> {
    return Promise.resolve(this.likes.delete(`${userId}:${tweetId}`));
  }

  removeAllForTweet(tweetId: string): Promise<void> {
    for (const key of this.likes) {
      if (key.endsWith(`:${tweetId}`)) this.likes.delete(key);
    }
    return Promise.resolve();
  }

  // Ordem de inserção = ordem das curtidas (a mais recente é a última).
  findLikerIds(tweetId: string, limit: number): Promise<string[]> {
    return Promise.resolve(
      [...this.likes]
        .filter((key) => key.endsWith(`:${tweetId}`))
        .map((key) => key.split(':')[0])
        .reverse()
        .slice(0, limit),
    );
  }

  findTweetIdsLikedBy(userId: string, limit: number): Promise<string[]> {
    return Promise.resolve(
      [...this.likes]
        .filter((key) => key.startsWith(`${userId}:`))
        .map((key) => key.split(':')[1])
        .reverse()
        .slice(0, limit),
    );
  }

  // Cada chamada fica registrada para os testes contarem as consultas.
  lookups: string[][] = [];

  findLikedTweetIds(userId: string, tweetIds: string[]): Promise<string[]> {
    this.lookups.push(tweetIds);
    return Promise.resolve(
      tweetIds.filter((tweetId) => this.likes.has(`${userId}:${tweetId}`)),
    );
  }
}
