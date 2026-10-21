import { NotFoundException } from '@nestjs/common';
import type { NewTweet, Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';
import { TweetsService } from './tweets.service.js';

class InMemoryTweetRepository extends TweetRepository {
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
}

describe('TweetsService', () => {
  let repository: InMemoryTweetRepository;
  let service: TweetsService;

  beforeEach(() => {
    repository = new InMemoryTweetRepository();
    service = new TweetsService(repository);
  });

  describe('create', () => {
    it('cria um tweet comum, sem parentId e com 0 curtidas', async () => {
      const tweet = await service.create({ authorId: 'u1', content: 'olá' });

      expect(tweet.parentId).toBeNull();
      expect(tweet.likesCount).toBe(0);
      expect(tweet.authorId).toBe('u1');
    });

    it('cria uma resposta quando o tweet respondido existe', async () => {
      const original = await service.create({ authorId: 'u1', content: 'olá' });

      const reply = await service.create({
        authorId: 'u2',
        content: 'oi!',
        parentId: original.id,
      });

      expect(reply.parentId).toBe(original.id);
    });

    it('recusa resposta a um tweet que não existe', async () => {
      await expect(
        service.create({
          authorId: 'u1',
          content: 'oi',
          parentId: 'nao-existe',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.tweets).toHaveLength(0);
    });
  });
});
