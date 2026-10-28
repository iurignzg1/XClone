import { NotFoundException } from '@nestjs/common';
import { silentEvents } from '../../../common/testing/silent-events.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { TweetsService } from './tweets.service.js';
import { InMemoryTweetRepository } from '../testing/in-memory-tweet.repository.js';

// Só a lógica do próprio service. Publicar, apagar, o feed e as listas de
// respostas dependem das consultas no Mongo e são testados nos e2e (test/).

// Só o método do UsersService que o TweetsService usa: "iuri" existe e é o u1.
const fakeUsersService = {
  getByUsername: (username: string) =>
    username === 'iuri'
      ? Promise.resolve({ id: 'u1', username } as User)
      : Promise.reject(new NotFoundException('Usuário não encontrado')),
} as unknown as UsersService;

describe('TweetsService', () => {
  let repository: InMemoryTweetRepository;
  let service: TweetsService;

  beforeEach(() => {
    repository = new InMemoryTweetRepository();
    service = new TweetsService(repository, fakeUsersService, silentEvents);
  });

  it('recusa resposta a um pio que não existe, sem gravar nada', async () => {
    await expect(
      service.create({ authorId: 'u1', content: 'oi', parentId: 'nao-existe' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.tweets).toHaveLength(0);
  });

  it('findByUsername de um perfil que não existe dá NotFound (e não erro interno)', async () => {
    await expect(service.findByUsername('fantasma', 20)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByIdsInOrder devolve na ordem dos ids e ignora os que não existem', async () => {
    const a = await service.create({ authorId: 'u1', content: 'a' });
    const b = await service.create({ authorId: 'u1', content: 'b' });

    const tweets = await service.findByIdsInOrder([b.id, 'sumiu', a.id]);

    expect(tweets.map((t) => t.id)).toEqual([b.id, a.id]);
  });

  it('createRepliesCountLoader conta as respostas de vários pios numa consulta só', async () => {
    const a = await service.create({ authorId: 'u1', content: 'a' });
    const b = await service.create({ authorId: 'u1', content: 'b' });
    const c = await service.create({ authorId: 'u1', content: 'c' });
    for (const parentId of [a.id, a.id, b.id]) {
      await service.create({ authorId: 'u2', content: 'r', parentId });
    }
    const loader = service.createRepliesCountLoader();

    const totals = await Promise.all([
      loader.load(a.id),
      loader.load(b.id),
      loader.load(c.id),
    ]);

    expect(totals).toEqual([2, 1, 0]);
    expect(repository.countRepliesCalls).toHaveLength(1);
  });
});
