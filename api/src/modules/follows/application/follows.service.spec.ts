import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { FollowsService } from './follows.service.js';
import { InMemoryFollowRepository } from '../testing/in-memory-follow.repository.js';

// Só o método do UsersService que o FollowsService usa.
const fakeUsersService = {
  findById: (id: string) =>
    Promise.resolve(id === 'existente' ? ({ id } as User) : null),
} as unknown as UsersService;

describe('FollowsService', () => {
  let repository: InMemoryFollowRepository;
  let service: FollowsService;

  beforeEach(() => {
    repository = new InMemoryFollowRepository();
    service = new FollowsService(repository, fakeUsersService);
  });

  describe('follow', () => {
    it('cria o vínculo quando o usuário existe', async () => {
      await service.follow('eu', 'existente');

      expect(repository.follows.has('eu:existente')).toBe(true);
    });

    it('é idempotente: seguir duas vezes não dá erro nem duplica', async () => {
      await service.follow('eu', 'existente');
      await service.follow('eu', 'existente');

      expect(repository.follows.size).toBe(1);
    });

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

  describe('unfollow', () => {
    it('remove o vínculo', async () => {
      await service.follow('eu', 'existente');

      await service.unfollow('eu', 'existente');

      expect(repository.follows.size).toBe(0);
    });

    it('é idempotente: deixar de seguir quem não se segue não dá erro', async () => {
      await expect(
        service.unfollow('eu', 'existente'),
      ).resolves.toBeUndefined();
    });
  });

  describe('contadores', () => {
    beforeEach(() => {
      // ana segue bia e caio; bia segue caio.
      repository.follows.add('ana:bia');
      repository.follows.add('ana:caio');
      repository.follows.add('bia:caio');
    });

    it('conta seguidores de cada usuário', async () => {
      const loader = service.createFollowersCountLoader();

      const totals = await Promise.all(
        ['ana', 'bia', 'caio'].map((id) => loader.load(id)),
      );

      expect(totals).toEqual([0, 1, 2]);
    });

    it('conta quantas pessoas cada usuário segue', async () => {
      const loader = service.createFollowingCountLoader();

      const totals = await Promise.all(
        ['ana', 'bia', 'caio'].map((id) => loader.load(id)),
      );

      expect(totals).toEqual([2, 1, 0]);
    });

    it('junta os contadores de vários usuários numa consulta só', async () => {
      const loader = service.createFollowersCountLoader();

      await Promise.all(['ana', 'bia', 'caio'].map((id) => loader.load(id)));

      expect(repository.countCalls).toEqual([['ana', 'bia', 'caio']]);
    });
  });

  describe('createFollowedByMeLoader', () => {
    beforeEach(() => {
      repository.follows.add('ana:bia');
      repository.follows.add('caio:ana');
    });

    it('responde se quem está logado segue cada usuário', async () => {
      const loader = service.createFollowedByMeLoader('ana');

      const result = await Promise.all(
        ['bia', 'caio', 'ana'].map((id) => loader.load(id)),
      );

      // ana segue bia; não segue caio (é caio quem segue ana); nem a si mesma.
      expect(result).toEqual([true, false, false]);
    });

    it('junta as perguntas de vários usuários numa consulta só', async () => {
      const loader = service.createFollowedByMeLoader('ana');

      await Promise.all(['bia', 'caio'].map((id) => loader.load(id)));

      expect(repository.followedCalls).toEqual([['bia', 'caio']]);
    });
  });
});
