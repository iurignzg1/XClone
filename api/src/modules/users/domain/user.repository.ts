import type { NewUser, ProfileChanges, User } from './user.entity.js';

// Classe abstrata (e não interface) porque interfaces somem em runtime e o
// Nest precisa de um valor para usar como token de injeção.
export abstract class UserRepository {
  abstract create(data: NewUser): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract findByIds(ids: string[]): Promise<User[]>;
  // Devolve o usuário atualizado, ou null se ele não existe.
  abstract updateProfile(
    id: string,
    changes: ProfileChanges,
  ): Promise<User | null>;
  // Devolve o usuário atualizado, ou null se ele não existe.
  abstract setSuspended(id: string, suspended: boolean): Promise<User | null>;
}
