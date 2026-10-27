import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import DataLoader from 'dataloader';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { FollowRepository } from '../domain/follow.repository.js';

@Injectable()
export class FollowsService {
  constructor(
    private readonly followRepository: FollowRepository,
    private readonly usersService: UsersService,
  ) {}

  // Idempotente: seguir quem já se segue não dá erro nem duplica.
  async follow(followerId: string, targetUserId: string): Promise<void> {
    if (followerId === targetUserId) {
      throw new BadRequestException('Você não pode seguir a si mesmo');
    }
    const target = await this.usersService.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.followRepository.add(followerId, targetUserId);
  }

  getFollowingIds(userId: string): Promise<string[]> {
    return this.followRepository.findFollowingIds(userId);
  }

  // Listas de "seguidores" e "seguindo" de um perfil (pelo @), do vínculo mais
  // recente para o mais antigo.
  async getFollowers(username: string, limit: number): Promise<User[]> {
    const user = await this.usersService.getByUsername(username);
    return this.loadInOrder(
      await this.followRepository.listFollowerIds(user.id, limit),
    );
  }

  async getFollowing(username: string, limit: number): Promise<User[]> {
    const user = await this.usersService.getByUsername(username);
    return this.loadInOrder(
      await this.followRepository.listFollowingIds(user.id, limit),
    );
  }

  // "Quem seguir": as contas mais seguidas que a pessoa ainda não segue (nem
  // ela mesma), sem contas suspensas. Busca o dobro para sobrar depois do filtro.
  async getSuggestions(viewerId: string, limit: number): Promise<User[]> {
    const following = await this.followRepository.findFollowingIds(viewerId);
    const ids = await this.followRepository.findMostFollowedIds(
      [viewerId, ...following],
      limit * 2,
    );
    const users = await this.loadInOrder(ids);
    return users.filter((user) => !user.suspended).slice(0, limit);
  }

  // O banco devolve os usuários em qualquer ordem: refaz a ordem dos ids.
  private async loadInOrder(userIds: string[]): Promise<User[]> {
    const users = await this.usersService.findByIds(userIds);
    const byId = new Map(users.map((user) => [user.id, user]));
    return userIds.flatMap((id) => byId.get(id) ?? []);
  }

  // Idempotente: deixar de seguir quem não se segue também não dá erro.
  async unfollow(followerId: string, targetUserId: string): Promise<void> {
    await this.followRepository.remove(followerId, targetUserId);
  }

  // Loader por requisição para o "eu sigo essa pessoa?" de quem está logado:
  // vários usuários na mesma resposta viram uma consulta só.
  createFollowedByMeLoader(viewerId: string): DataLoader<string, boolean> {
    return new DataLoader<string, boolean>(async (userIds) => {
      const followed = new Set(
        await this.followRepository.findFollowedIds(viewerId, [...userIds]),
      );
      return userIds.map((id) => followed.has(id));
    });
  }

  // Loaders por requisição: os contadores de todos os usuários de uma resposta
  // (ex.: a lista de quem curtiu) saem numa consulta só, sem N+1.
  createFollowersCountLoader(): DataLoader<string, number> {
    return countLoader((ids) => this.followRepository.countFollowers(ids));
  }

  createFollowingCountLoader(): DataLoader<string, number> {
    return countLoader((ids) => this.followRepository.countFollowing(ids));
  }
}

function countLoader(
  count: (ids: string[]) => Promise<Map<string, number>>,
): DataLoader<string, number> {
  return new DataLoader<string, number>(async (ids) => {
    const totals = await count([...ids]);
    return ids.map((id) => totals.get(id) ?? 0);
  });
}
