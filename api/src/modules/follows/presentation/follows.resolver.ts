import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { User } from '../../users/domain/user.entity.js';
import { FollowsService } from '../application/follows.service.js';
import { FollowUserInput } from './dto/follow-user.input.js';

@Resolver()
export class FollowsResolver {
  constructor(private readonly followsService: FollowsService) {}

  @Mutation(() => Boolean)
  async followUser(
    @CurrentUser() user: User,
    @Args('input') input: FollowUserInput,
  ): Promise<boolean> {
    await this.followsService.follow(user.id, input.userId);
    return true;
  }

  @Mutation(() => Boolean)
  async unfollowUser(
    @CurrentUser() user: User,
    @Args('input') input: FollowUserInput,
  ): Promise<boolean> {
    await this.followsService.unfollow(user.id, input.userId);
    return true;
  }
}
