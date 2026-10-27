import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { TweetType } from '../../tweets/presentation/types/tweet.type.js';
import type { User } from '../../users/domain/user.entity.js';
import { FeedService } from '../application/feed.service.js';
import { FeedArgs } from './dto/feed.args.js';

@Resolver()
export class FeedResolver {
  constructor(private readonly feedService: FeedService) {}

  @Query(() => [TweetType])
  feed(@CurrentUser() user: User, @Args() args: FeedArgs): Promise<Tweet[]> {
    return this.feedService.getFeed(user.id, args.limit, args.after);
  }
}
