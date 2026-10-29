import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import DataLoader from 'dataloader';
import type { NewUser, ProfileChanges, User } from '../domain/user.entity.js';
import { UserRepository } from '../domain/user.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  create(data: NewUser): Promise<User> {
    return this.userRepository.create(data);
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async getByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Como o getByUsername, mas visitantes (sem login) não veem contas
  // suspensas: o perfil some, como se não existisse. Quem está logado vê (o
  // ADMIN precisa dele para reativar a conta).
  async getByUsernameFor(
    viewer: User | undefined,
    username: string,
  ): Promise<User> {
    const user = await this.getByUsername(username);
    if (!viewer && user.suspended) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Cada pessoa só altera o próprio perfil: o id vem do usuário logado, nunca do
  // cliente, então não dá para editar o perfil de outra conta.
  async updateProfile(userId: string, changes: ProfileChanges): Promise<User> {
    const user = await this.userRepository.updateProfile(userId, changes);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Quem pode suspender (só ADMIN) é decidido pelo @Roles na mutation.
  // Conta suspensa não faz login e perde o acesso na hora (ver JwtStrategy).
  async suspend(adminId: string, targetUserId: string): Promise<User> {
    if (adminId === targetUserId) {
      throw new BadRequestException('Você não pode suspender a própria conta');
    }
    const user = await this.userRepository.setSuspended(targetUserId, true);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Tira a suspensão: a pessoa volta a poder entrar. Também só ADMIN (@Roles).
  async unsuspend(targetUserId: string): Promise<User> {
    const user = await this.userRepository.setSuspended(targetUserId, false);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Página de administração: quem está suspenso hoje.
  listSuspended(limit: number): Promise<User[]> {
    return this.userRepository.findSuspended(limit);
  }

  // Busca da barra de pesquisa. Termo vazio não busca nada.
  search(term: string, limit: number): Promise<User[]> {
    const clean = term.trim();
    if (!clean) return Promise.resolve([]);
    return this.userRepository.search(clean, limit);
  }

  findByIds(ids: string[]): Promise<User[]> {
    return this.userRepository.findByIds(ids);
  }

  // Um loader por requisição: junta as buscas de usuário por id feitas na
  // mesma resposta (ex.: o autor de cada tweet do feed) numa única consulta.
  createByIdLoader(): DataLoader<string, User> {
    return new DataLoader<string, User>(async (ids) => {
      const users = await this.userRepository.findByIds([...ids]);
      const byId = new Map(users.map((user) => [user.id, user]));
      // O DataLoader exige uma resposta por id, na mesma ordem dos ids.
      return ids.map(
        (id) => byId.get(id) ?? new NotFoundException('Usuário não encontrado'),
      );
    });
  }
}
