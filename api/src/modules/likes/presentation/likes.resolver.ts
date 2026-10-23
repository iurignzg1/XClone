import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type DataLoader from 'dataloader';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { TweetType } from '../../tweets/presentation/types/tweet.type.js';
import type { User } from '../../users/domain/user.entity.js';
import { UserType } from '../../users/presentation/types/user.type.js';
import {
  LikesService,
  ToggleLikeResult,
} from '../application/likes.service.js';
import { ToggleLikeInput } from './dto/toggle-like.input.js';
import { TweetLikesArgs } from './dto/tweet-likes.args.js';
import { ToggleLikePayload } from './types/toggle-like-payload.type.js';

// O contexto do GraphQL vive uma requisição inteira: é onde guardamos o loader.
interface LikesGqlContext {
  likedByMeLoader?: DataLoader<string, boolean>;
}

@Resolver(() => TweetType)
export class LikesResolver {
  constructor(private readonly likesService: LikesService) {}

  // Campo calculado do Tweet: o usuário logado curtiu este tweet?
  @ResolveField(() => Boolean)
  likedByMe(
    @Parent() tweet: Tweet,
    @CurrentUser() user: User,
    @Context() context: LikesGqlContext,
  ): Promise<boolean> {
    context.likedByMeLoader ??= this.likesService.createLikedByMeLoader(
      user.id,
    );
    return context.likedByMeLoader.load(tweet.id);
  }

  @Query(() => [UserType])
  tweetLikes(@Args() args: TweetLikesArgs): Promise<User[]> {
    return this.likesService.getLikers(args.tweetId, args.limit);
  }

  @Mutation(() => ToggleLikePayload)
  toggleLike(
    @CurrentUser() user: User,
    @Args('input') input: ToggleLikeInput,
  ): Promise<ToggleLikeResult> {
    return this.likesService.toggle(user.id, input.tweetId);
  }
}
