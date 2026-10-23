import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { User } from '../../users/domain/user.entity.js';
import { TweetsService } from '../application/tweets.service.js';
import type { Tweet } from '../domain/tweet.entity.js';
import { CreateTweetInput } from './dto/create-tweet.input.js';
import { DeleteTweetInput } from './dto/delete-tweet.input.js';
import { TweetOwnerGuard } from './guards/tweet-owner.guard.js';
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

  @UseGuards(TweetOwnerGuard)
  @Mutation(() => Boolean)
  async deleteTweet(@Args('input') input: DeleteTweetInput): Promise<boolean> {
    await this.tweetsService.delete(input.tweetId);
    return true;
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
