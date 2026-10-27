import type { NewUser, ProfileChanges, User } from './user.entity.js';

// Classe abstrata (e não interface) porque interfaces somem em runtime e o
// Nest precisa de um valor para usar como token de injeção.
export abstract class UserRepository {
  abstract create(data: NewUser): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract findByIds(ids: string[]): Promise<User[]>;
  // Busca por @ (começa com o termo) ou por nome (contém o termo, sem
  // diferenciar maiúsculas). Contas suspensas ficam de fora.
  abstract search(term: string, limit: number): Promise<User[]>;
  // Devolve o usuário atualizado, ou null se ele não existe.
  abstract updateProfile(
    id: string,
    changes: ProfileChanges,
  ): Promise<User | null>;
  // Contas suspensas, em ordem alfabética de @ (página de administração).
  abstract findSuspended(limit: number): Promise<User[]>;
  // Devolve o usuário atualizado, ou null se ele não existe.
  abstract setSuspended(id: string, suspended: boolean): Promise<User | null>;
}
