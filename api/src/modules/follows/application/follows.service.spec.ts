import { BadRequestException, NotFoundException } from '@nestjs/common';
import { silentEvents } from '../../../common/testing/silent-events.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { FollowsService } from './follows.service.js';
import { InMemoryFollowRepository } from '../testing/in-memory-follow.repository.js';

// Só a lógica do próprio service (regras, ordem, filtros e DataLoaders).
// Seguir e deixar de seguir de ponta a ponta estão nos e2e de feed e
// notificações (test/).

// Só os métodos do UsersService que o FollowsService usa. O @ de cada usuário é
// o próprio id; a conta "suspensa" está suspensa; e o findByIds devolve fora de
// ordem de propósito, como o banco.
const fakeUsersService = {
  findById: (id: string) =>
    Promise.resolve(id === 'existente' ? ({ id } as User) : null),
  getByUsername: (username: string) =>
    username === 'fantasma'
      ? Promise.reject(new NotFoundException('Usuário não encontrado'))
      : Promise.resolve({ id: username, username } as User),
  findByIds: (ids: string[]) =>
    Promise.resolve(
      ids
        .map(
          (id) => ({ id, username: id, suspended: id === 'suspensa' }) as User,
        )
        .reverse(),
    ),
} as unknown as UsersService;

describe('FollowsService', () => {
  let repository: InMemoryFollowRepository;
  let service: FollowsService;

  beforeEach(() => {
    repository = new InMemoryFollowRepository();
    service = new FollowsService(repository, fakeUsersService, silentEvents);
  });

  describe('follow', () => {
    it('não permite seguir a si mesmo', async () => {
      await expect(
        service.follow('existente', 'existente'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.follows.size).toBe(0);
    });

    it('recusa seguir um usuário que não existe', async () => {
      await expect(service.follow('eu', 'fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.follows.size).toBe(0);
    });
  });

  describe('listas de seguidores e seguindo', () => {
    beforeEach(async () => {
      // ana segue bia e caio; bia e caio seguem ana (nesta ordem).
      await repository.add('ana', 'bia');
      await repository.add('ana', 'caio');
      await repository.add('bia', 'ana');
      await repository.add('caio', 'ana');
    });

    it('vêm do vínculo mais recente para o mais antigo', async () => {
      const followers = await service.getFollowers('ana', 10);
      const following = await service.getFollowing('ana', 10);

      expect(followers.map((u) => u.id)).toEqual(['caio', 'bia']);
      expect(following.map((u) => u.id)).toEqual(['caio', 'bia']);
    });

    it('perfil inexistente dá NotFound', async () => {
      await expect(service.getFollowers('fantasma', 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getSuggestions', () => {
    beforeEach(async () => {
      // A conta suspensa é a mais seguida (4); depois bia e caio (3), duda (1).
      // ana já segue caio.
      for (const fan of ['w', 'x', 'y', 'z'])
        await repository.add(fan, 'suspensa');
      for (const fan of ['x', 'y', 'z']) await repository.add(fan, 'bia');
      for (const fan of ['x', 'y', 'ana']) await repository.add(fan, 'caio');
      await repository.add('x', 'duda');
    });

    it('sugere os mais seguidos, sem quem a pessoa já segue e sem ela mesma', async () => {
      const forAna = await service.getSuggestions('ana', 3);
      const forBia = await service.getSuggestions('bia', 3);

      expect(forAna.map((u) => u.id)).toEqual(['bia', 'duda']);
      expect(forBia.map((u) => u.id)).toEqual(['caio', 'duda']);
    });

    it('deixa contas suspensas de fora sem faltar sugestão (busca o dobro antes de filtrar)', async () => {
      // Com limite 1, a mais seguida é a suspensa: se o service buscasse só 1,
      // sobraria nada depois do filtro.
      const suggestions = await service.getSuggestions('ana', 1);

      expect(suggestions.map((u) => u.id)).toEqual(['bia']);
    });
  });

  describe('DataLoaders', () => {
    beforeEach(() => {
      // ana segue bia e caio; bia segue caio.
      repository.follows.add('ana:bia');
      repository.follows.add('ana:caio');
      repository.follows.add('bia:caio');
    });

    it('contam seguidores e seguindo de vários usuários, cada contador numa consulta só', async () => {
      const followers = service.createFollowersCountLoader();
      const following = service.createFollowingCountLoader();
      const ids = ['ana', 'bia', 'caio'];

      const [followersTotals, followingTotals] = await Promise.all([
        Promise.all(ids.map((id) => followers.load(id))),
        Promise.all(ids.map((id) => following.load(id))),
      ]);

      expect(followersTotals).toEqual([0, 1, 2]);
      expect(followingTotals).toEqual([2, 1, 0]);
      expect(repository.countCalls).toEqual([ids, ids]);
    });

    it('respondem numa consulta só se quem está logado segue cada usuário', async () => {
      const loader = service.createFollowedByMeLoader('bia');

      const result = await Promise.all(
        ['ana', 'caio', 'bia'].map((id) => loader.load(id)),
      );

      // O sentido importa: ana segue bia, mas bia não segue ana. bia segue
      // caio e não segue a si mesma.
      expect(result).toEqual([false, true, false]);
      expect(repository.followedCalls).toEqual([['ana', 'caio', 'bia']]);
    });
  });
});
