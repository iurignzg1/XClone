import { NotFoundException } from '@nestjs/common';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
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

  // Cada chamada fica registrada para os testes contarem as consultas.
  lookups: string[][] = [];

  findLikedTweetIds(userId: string, tweetIds: string[]): Promise<string[]> {
    this.lookups.push(tweetIds);
    return Promise.resolve(
      tweetIds.filter((tweetId) => this.likes.has(`${userId}:${tweetId}`)),
    );
  }
}

// Só os dois métodos do TweetsService que o LikesService usa.
function fakeTweetsService(tweet: Tweet) {
  return {
    findById: (id: string) =>
      id === tweet.id
        ? Promise.resolve(tweet)
        : Promise.reject(new NotFoundException('Tweet não encontrado')),
    // Mesma semântica do repositório real: soma sem trava e, na leitura,
    // nunca devolve contador negativo.
    addLikes: (id: string, delta: number) => {
      if (id !== tweet.id) return Promise.resolve(null);
      tweet.likesCount += delta;
      return Promise.resolve({
        ...tweet,
        likesCount: Math.max(0, tweet.likesCount),
      });
    },
  } as unknown as TweetsService;
}

// Devolve os usuários fora de ordem de propósito, como o banco pode fazer.
const fakeUsersService = {
  findByIds: (ids: string[]) =>
    Promise.resolve(ids.map((id) => ({ id, username: id }) as User).reverse()),
} as unknown as UsersService;

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
    service = new LikesService(
      likes,
      fakeTweetsService(tweet),
      fakeUsersService,
    );
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

  it('duplo clique simultâneo do mesmo usuário não desajusta o contador', async () => {
    // Reproduz a ordem que quebrava a versão anterior: a 1ª requisição grava a
    // curtida e, antes de somar 1, a 2ª remove essa curtida e desconta 1.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const realAdd = likes.add.bind(likes);
    likes.add = async (userId: string, tweetId: string) => {
      const created = await realAdd(userId, tweetId);
      await gate;
      return created;
    };

    const first = service.toggle('u1', 't1');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await service.toggle('u1', 't1');
    release();
    await first;

    expect(likes.likes.size).toBe(0);
    expect(tweet.likesCount).toBe(0);
  });

  it('recusa curtir um tweet que não existe', async () => {
    await expect(service.toggle('u1', 'nao-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(likes.likes.size).toBe(0);
  });

  describe('createLikedByMeLoader', () => {
    it('responde true só para os tweets que o usuário curtiu', async () => {
      likes.likes.add('u1:t1');
      likes.likes.add('u1:t3');
      const loader = service.createLikedByMeLoader('u1');

      const result = await Promise.all([
        loader.load('t1'),
        loader.load('t2'),
        loader.load('t3'),
      ]);

      expect(result).toEqual([true, false, true]);
    });

    it('junta várias consultas numa só (evita o N+1)', async () => {
      const loader = service.createLikedByMeLoader('u1');

      await Promise.all(['t1', 't2', 't3', 't4'].map((id) => loader.load(id)));

      expect(likes.lookups).toHaveLength(1);
      expect(likes.lookups[0]).toEqual(['t1', 't2', 't3', 't4']);
    });

    it('não confunde curtidas de usuários diferentes', async () => {
      likes.likes.add('u2:t1');
      const loader = service.createLikedByMeLoader('u1');

      await expect(loader.load('t1')).resolves.toBe(false);
    });
  });

  describe('getLikers', () => {
    it('lista quem curtiu, da curtida mais recente para a mais antiga', async () => {
      await service.toggle('u1', 't1');
      await service.toggle('u2', 't1');
      await service.toggle('u3', 't1');

      const likers = await service.getLikers('t1', 50);

      expect(likers.map((user) => user.id)).toEqual(['u3', 'u2', 'u1']);
    });

    it('respeita o limite', async () => {
      await service.toggle('u1', 't1');
      await service.toggle('u2', 't1');

      const likers = await service.getLikers('t1', 1);

      expect(likers.map((user) => user.id)).toEqual(['u2']);
    });

    it('não lista quem descurtiu', async () => {
      await service.toggle('u1', 't1');
      await service.toggle('u1', 't1');

      await expect(service.getLikers('t1', 50)).resolves.toEqual([]);
    });

    it('recusa um tweet que não existe', async () => {
      await expect(service.getLikers('nao-existe', 50)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('handleTweetDeleted', () => {
    it('apaga as curtidas do tweet apagado e só dele', async () => {
      likes.likes.add('u1:t1');
      likes.likes.add('u2:t1');
      likes.likes.add('u1:t2');

      await service.handleTweetDeleted({ tweetId: 't1' });

      expect([...likes.likes]).toEqual(['u1:t2']);
    });
  });
});
