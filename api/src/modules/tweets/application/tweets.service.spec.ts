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

  findReplies(parentId: string, limit: number): Promise<Tweet[]> {
    return Promise.resolve(
      this.tweets.filter((t) => t.parentId === parentId).slice(0, limit),
    );
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

  describe('findById', () => {
    it('devolve o tweet quando ele existe', async () => {
      const created = await service.create({ authorId: 'u1', content: 'olá' });

      await expect(service.findById(created.id)).resolves.toEqual(created);
    });

    it('lança NotFound quando o tweet não existe', async () => {
      await expect(service.findById('nao-existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findReplies', () => {
    it('devolve só as respostas do tweet informado', async () => {
      const a = await service.create({ authorId: 'u1', content: 'a' });
      const b = await service.create({ authorId: 'u1', content: 'b' });
      const replyToA = await service.create({
        authorId: 'u2',
        content: 'resposta a A',
        parentId: a.id,
      });
      await service.create({
        authorId: 'u2',
        content: 'resposta a B',
        parentId: b.id,
      });

      const replies = await service.findReplies(a.id);

      expect(replies).toEqual([replyToA]);
    });
  });

  describe('delete', () => {
    it('apaga o tweet', async () => {
      const created = await service.create({ authorId: 'u1', content: 'olá' });

      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('apagar um tweet que não existe não dá erro', async () => {
      await expect(service.delete('nao-existe')).resolves.toBeUndefined();
    });
  });
});
