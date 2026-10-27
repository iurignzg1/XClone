import { UserConflictError } from '../domain/user-conflict.error.js';
import { UserRole } from '../domain/user-role.enum.js';
import type { NewUser, ProfileChanges, User } from '../domain/user.entity.js';
import { UserRepository } from '../domain/user.repository.js';

// Repositório de usuários em memória, só para os testes (não vai para o build).

export class InMemoryUserRepository extends UserRepository {
  users: User[] = [];

  create(data: NewUser): Promise<User> {
    const taken = this.users.find(
      (u) => u.username === data.username || u.email === data.email,
    );
    if (taken) {
      return Promise.reject(
        new UserConflictError(
          taken.email === data.email ? 'email' : 'username',
        ),
      );
    }
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
  updateProfile(id: string, changes: ProfileChanges) {
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.displayName = changes.displayName;
      user.bio = changes.bio;
    }
    return Promise.resolve(user ?? null);
  }
  setSuspended(id: string, suspended: boolean) {
    const user = this.users.find((u) => u.id === id);
    if (user) user.suspended = suspended;
    return Promise.resolve(user ?? null);
  }
  // Cada chamada fica registrada para os testes contarem as consultas.
  findByIdsCalls: string[][] = [];
  findByIds(ids: string[]) {
    this.findByIdsCalls.push(ids);
    return Promise.resolve(this.users.filter((u) => ids.includes(u.id)));
  }
  findByUsername(username: string) {
    return Promise.resolve(
      this.users.find((u) => u.username === username) ?? null,
    );
  }
}
