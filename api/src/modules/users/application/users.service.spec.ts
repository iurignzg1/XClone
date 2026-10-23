import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../domain/user-role.enum.js';
import type { NewUser, User } from '../domain/user.entity.js';
import { UserRepository } from '../domain/user.repository.js';
import { UsersService } from './users.service.js';

class InMemoryUserRepository extends UserRepository {
  users: User[] = [];

  create(data: NewUser): Promise<User> {
    const user: User = {
      ...data,
      id: `user-${this.users.length + 1}`,
      role: UserRole.USER,
      bio: '',
      suspended: false,
      createdAt: new Date(),
    };
    this.users.push(user);
    return Promise.resolve(user);
  }
  findById(id: string) {
    return Promise.resolve(this.users.find((u) => u.id === id) ?? null);
  }
  findByEmail(email: string) {
    return Promise.resolve(this.users.find((u) => u.email === email) ?? null);
  }
  findByUsername(username: string) {
    return Promise.resolve(
      this.users.find((u) => u.username === username) ?? null,
    );
  }
  setSuspended(id: string, suspended: boolean) {
    const user = this.users.find((u) => u.id === id);
    if (user) user.suspended = suspended;
    return Promise.resolve(user ?? null);
  }
  findByIds(ids: string[]) {
    return Promise.resolve(this.users.filter((u) => ids.includes(u.id)));
  }
}

describe('UsersService', () => {
  let repository: InMemoryUserRepository;
  let service: UsersService;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    service = new UsersService(repository);
    await service.create({
      username: 'iuri',
      email: 'iuri@example.com',
      passwordHash: 'hash',
      displayName: 'Iuri',
    });
  });

  describe('getByUsername', () => {
    it('devolve o usuário quando ele existe', async () => {
      const user = await service.getByUsername('iuri');

      expect(user.email).toBe('iuri@example.com');
    });

    it('lança NotFound quando o usuário não existe', async () => {
      await expect(service.getByUsername('fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('suspend', () => {
    it('marca a conta como suspensa e devolve o usuário atualizado', async () => {
      const alvo = await service.create({
        username: 'alvo',
        email: 'alvo@example.com',
        passwordHash: 'hash',
        displayName: 'Alvo',
      });

      const result = await service.suspend('admin', alvo.id);

      expect(result.suspended).toBe(true);
      expect(repository.users.find((u) => u.id === alvo.id)?.suspended).toBe(
        true,
      );
    });

    it('não permite que o admin suspenda a própria conta', async () => {
      await expect(service.suspend('admin', 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lança NotFound quando o usuário não existe', async () => {
      await expect(service.suspend('admin', 'fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
