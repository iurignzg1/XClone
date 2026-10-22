import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { User } from '../../users/domain/user.entity.js';
import { TweetsService } from '../application/tweets.service.js';
import type { Tweet } from '../domain/tweet.entity.js';
import { CreateTweetInput } from './dto/create-tweet.input.js';
import { TweetType } from './types/tweet.type.js';

@Resolver(() => TweetType)
export class TweetsResolver {
  constructor(private readonly tweetsService: TweetsService) {}

  @Mutation(() => TweetType)
  createTweet(
    @CurrentUser() user: User,
    @Args('input') input: CreateTweetInput,
  ): Promise<Tweet> {
    return this.tweetsService.create({
      authorId: user.id,
      content: input.content,
      parentId: input.parentId,
    });
  }

  @Query(() => TweetType)
  tweet(@Args('id', { type: () => ID }) id: string): Promise<Tweet> {
    return this.tweetsService.findById(id);
  }

  // Campo calculado: só é buscado quando o cliente pede `replies` na query.
  @ResolveField(() => [TweetType])
  replies(@Parent() tweet: Tweet): Promise<Tweet[]> {
    return this.tweetsService.findReplies(tweet.id);
  }
}
