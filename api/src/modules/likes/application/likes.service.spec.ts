import { NotFoundException } from '@nestjs/common';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { LikeRepository } from '../domain/like.repository.js';
import { LikesService } from './likes.service.js';

class InMemoryLikeRepository extends LikeRepository {
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
}

// Só os dois métodos do TweetsService que o LikesService usa.
function fakeTweetsService(tweet: Tweet) {
  return {
    findById: (id: string) =>
      id === tweet.id
        ? Promise.resolve(tweet)
        : Promise.reject(new NotFoundException('Tweet não encontrado')),
    addLikes: (id: string, delta: number) => {
      if (id !== tweet.id || tweet.likesCount + delta < 0) {
        return Promise.resolve(null);
      }
      tweet.likesCount += delta;
      return Promise.resolve(tweet);
    },
  } as unknown as TweetsService;
}

describe('LikesService', () => {
  let tweet: Tweet;
  let likes: InMemoryLikeRepository;
  let service: LikesService;

  beforeEach(() => {
    tweet = {
      id: 't1',
      content: 'olá',
      authorId: 'u9',
      parentId: null,
      likesCount: 0,
      createdAt: new Date(),
    };
    likes = new InMemoryLikeRepository();
    service = new LikesService(likes, fakeTweetsService(tweet));
  });

  it('curte um tweet ainda não curtido e soma 1 ao contador', async () => {
    const result = await service.toggle('u1', 't1');

    expect(result).toEqual({ liked: true, likesCount: 1 });
  });

  it('a segunda chamada do mesmo usuário remove a curtida e volta o contador', async () => {
    await service.toggle('u1', 't1');

    const result = await service.toggle('u1', 't1');

    expect(result).toEqual({ liked: false, likesCount: 0 });
    expect(likes.likes.size).toBe(0);
  });

  it('usuários diferentes curtem o mesmo tweet de forma independente', async () => {
    await service.toggle('u1', 't1');
    const result = await service.toggle('u2', 't1');

    expect(result).toEqual({ liked: true, likesCount: 2 });
  });

  it('não soma ao contador quando outra requisição já criou a curtida', async () => {
    // Simula a corrida: a curtida aparece entre o "remove" e o "add".
    likes.remove = () => Promise.resolve(false);
    likes.add = () => Promise.resolve(false);
    tweet.likesCount = 1;

    const result = await service.toggle('u1', 't1');

    expect(result).toEqual({ liked: true, likesCount: 1 });
  });

  it('recusa curtir um tweet que não existe', async () => {
    await expect(service.toggle('u1', 'nao-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(likes.likes.size).toBe(0);
  });
});
