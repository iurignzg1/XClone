import type { NewTweet, Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';

// Repositório de tweets em memória, só para os testes (não vai para o build).

export class InMemoryTweetRepository extends TweetRepository {
  tweets: Tweet[] = [];

  create(data: NewTweet): Promise<Tweet> {
    const tweet: Tweet = {
      id: `tweet-${this.tweets.length + 1}`,
      content: data.content,
      authorId: data.authorId,
      parentId: data.parentId ?? null,
      likesCount: 0,
      createdAt: new Date(),
    };
    this.tweets.push(tweet);
    return Promise.resolve(tweet);
  }

  findById(id: string): Promise<Tweet | null> {
    return Promise.resolve(this.tweets.find((t) => t.id === id) ?? null);
  }

  deleteById(id: string): Promise<boolean> {
    const before = this.tweets.length;
    this.tweets = this.tweets.filter((t) => t.id !== id);
    return Promise.resolve(this.tweets.length < before);
  }

  findByAuthors(authorIds: string[], limit: number): Promise<Tweet[]> {
    return Promise.resolve(
      this.tweets
        .filter((t) => authorIds.includes(t.authorId) && t.parentId === null)
        .reverse()
        .slice(0, limit),
    );
  }

  addLikes(id: string, delta: number): Promise<Tweet | null> {
    const tweet = this.tweets.find((t) => t.id === id);
    if (!tweet) return Promise.resolve(null);
    tweet.likesCount += delta;
    return Promise.resolve({
      ...tweet,
      likesCount: Math.max(0, tweet.likesCount),
    });
  }

  // Cada chamada fica registrada para os testes contarem as consultas.
  countRepliesCalls: string[][] = [];

  countReplies(parentIds: string[]): Promise<Map<string, number>> {
    this.countRepliesCalls.push(parentIds);
    const totals = new Map<string, number>();
    for (const tweet of this.tweets) {
      if (tweet.parentId && parentIds.includes(tweet.parentId)) {
        totals.set(tweet.parentId, (totals.get(tweet.parentId) ?? 0) + 1);
      }
    }
    return Promise.resolve(totals);
  }

  findRepliesByAuthor(authorId: string, limit: number): Promise<Tweet[]> {
    return Promise.resolve(
      this.tweets
        .filter((t) => t.authorId === authorId && t.parentId !== null)
        .reverse()
        .slice(0, limit),
    );
  }

  findMostLiked(limit: number, excludeAuthorIds: string[]): Promise<Tweet[]> {
    return Promise.resolve(
      this.tweets
        .filter(
          (t) => t.parentId === null && !excludeAuthorIds.includes(t.authorId),
        )
        .reverse()
        .sort((a, b) => b.likesCount - a.likesCount)
        .slice(0, limit),
    );
  }

  findByIds(ids: string[]): Promise<Tweet[]> {
    return Promise.resolve(this.tweets.filter((t) => ids.includes(t.id)));
  }

  findReplies(parentId: string, limit: number): Promise<Tweet[]> {
    return Promise.resolve(
      this.tweets.filter((t) => t.parentId === parentId).slice(0, limit),
    );
  }
}
