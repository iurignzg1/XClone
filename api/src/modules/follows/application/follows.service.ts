import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import DataLoader from 'dataloader';
import { UsersService } from '../../users/application/users.service.js';
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
