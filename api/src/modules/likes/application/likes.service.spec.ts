import { NotFoundException } from '@nestjs/common';
import { silentEvents } from '../../../common/testing/silent-events.js';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { LikesService } from './likes.service.js';
import { InMemoryLikeRepository } from '../testing/in-memory-like.repository.js';

// Aqui ficam as corridas (que só dá para encenar controlando o repositório) e
// a lógica do próprio service. Curtir, descurtir, contar e apagar junto com o
// pio, de ponta a ponta, estão em test/likes.e2e-spec.ts.

// Só os métodos do TweetsService que o LikesService usa.
function fakeTweetsService(tweet: Tweet) {
  return {
    findById: (id: string) =>
      id === tweet.id
        ? Promise.resolve(tweet)
        : Promise.reject(new NotFoundException('Pio não encontrado')),
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
    // Só o tweet de teste existe; ids desconhecidos somem, como no real.
    findByIdsInOrder: (ids: string[]) =>
      Promise.resolve(ids.filter((id) => id === tweet.id).map(() => tweet)),
  } as unknown as TweetsService;
}

// Devolve os usuários fora de ordem de propósito, como o banco pode fazer.
const fakeUsersService = {
  getByUsername: (username: string) =>
    Promise.resolve({ id: username, username } as User),
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
      silentEvents,
    );
  });

  describe('toggle em corrida', () => {
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
  });

  it('createLikedByMeLoader junta as perguntas numa consulta só e responde na ordem pedida', async () => {
    likes.likes.add('u1:t1');
    likes.likes.add('u1:t3');
    const loader = service.createLikedByMeLoader('u1');

    const result = await Promise.all(
      ['t1', 't2', 't3', 't4'].map((id) => loader.load(id)),
    );

    expect(result).toEqual([true, false, true, false]);
    expect(likes.lookups).toEqual([['t1', 't2', 't3', 't4']]);
  });

  describe('getLikers', () => {
    it('lista quem curtiu, da curtida mais recente para a mais antiga', async () => {
      await service.toggle('u1', 't1');
      await service.toggle('u2', 't1');
      await service.toggle('u3', 't1');

      const likers = await service.getLikers('t1', 50);

      expect(likers.map((user) => user.id)).toEqual(['u3', 'u2', 'u1']);
    });

    it('recusa um tweet que não existe', async () => {
      await expect(service.getLikers('nao-existe', 50)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('getLikedTweets lista o que a pessoa curtiu, sem os pios que não existem mais', async () => {
    await service.toggle('ana', 't1');
    await likes.add('ana', 'apagado');

    const liked = await service.getLikedTweets('ana', 10);

    expect(liked.map((t) => t.id)).toEqual(['t1']);
  });
});
