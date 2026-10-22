import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { User } from '../../users/domain/user.entity.js';
import {
  LikesService,
  ToggleLikeResult,
} from '../application/likes.service.js';
import { ToggleLikeInput } from './dto/toggle-like.input.js';
import { ToggleLikePayload } from './types/toggle-like-payload.type.js';

@Resolver()
export class LikesResolver {
  constructor(private readonly likesService: LikesService) {}

  @Mutation(() => ToggleLikePayload)
  toggleLike(
    @CurrentUser() user: User,
    @Args('input') input: ToggleLikeInput,
  ): Promise<ToggleLikeResult> {
    return this.likesService.toggle(user.id, input.tweetId);
  }
}
