import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
}
