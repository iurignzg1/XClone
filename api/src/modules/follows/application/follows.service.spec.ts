import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { FollowRepository } from '../domain/follow.repository.js';
import { FollowsService } from './follows.service.js';

class InMemoryFollowRepository extends FollowRepository {
  follows = new Set<string>();

  add(followerId: string, followingId: string): Promise<boolean> {
    const key = `${followerId}:${followingId}`;
    const isNew = !this.follows.has(key);
    this.follows.add(key);
    return Promise.resolve(isNew);
  }

  findFollowingIds(followerId: string): Promise<string[]> {
    return Promise.resolve(
      [...this.follows]
        .filter((key) => key.startsWith(`${followerId}:`))
        .map((key) => key.split(':')[1]),
    );
  }

  remove(followerId: string, followingId: string): Promise<boolean> {
    return Promise.resolve(this.follows.delete(`${followerId}:${followingId}`));
  }
}

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
});
