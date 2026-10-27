import {
  Args,
  Context,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { UserType } from '../../users/presentation/types/user.type.js';
import { TweetsService } from '../application/tweets.service.js';
import type { Tweet } from '../domain/tweet.entity.js';
import { CreateTweetInput } from './dto/create-tweet.input.js';
import { DeleteTweetInput } from './dto/delete-tweet.input.js';
import { UserTweetsArgs } from './dto/user-tweets.args.js';
import { TweetOwnerGuard } from './guards/tweet-owner.guard.js';
import { TweetType } from './types/tweet.type.js';

// O contexto do GraphQL vive uma requisição inteira: é onde guardamos o loader.
interface TweetsGqlContext {
  userByIdLoader?: DataLoader<string, User>;
  repliesCountLoader?: DataLoader<string, number>;
}

@Resolver(() => TweetType)
export class TweetsResolver {
  constructor(
    private readonly tweetsService: TweetsService,
    private readonly usersService: UsersService,
  ) {}

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

  @Query(() => [TweetType])
  userTweets(@Args() args: UserTweetsArgs): Promise<Tweet[]> {
    return this.tweetsService.findByUsername(args.username, args.limit);
  }

  // Campo calculado: só é buscado quando o cliente pede `replies` na query.
  @ResolveField(() => [TweetType])
  replies(@Parent() tweet: Tweet): Promise<Tweet[]> {
    return this.tweetsService.findReplies(tweet.id);
  }

  // Campo calculado: quantas respostas o tweet tem. O DataLoader conta as de
  // todos os tweets da resposta numa consulta só.
  @ResolveField(() => Int)
  repliesCount(
    @Parent() tweet: Tweet,
    @Context() context: TweetsGqlContext,
  ): Promise<number> {
    context.repliesCountLoader ??=
      this.tweetsService.createRepliesCountLoader();
    return context.repliesCountLoader.load(tweet.id);
  }

  // Campo calculado: quem escreveu o tweet. O DataLoader junta os autores de
  // todos os tweets da resposta numa consulta só (sem ele, um feed de 20
  // tweets faria 20 consultas a mais).
  @ResolveField(() => UserType)
  author(
    @Parent() tweet: Tweet,
    @Context() context: TweetsGqlContext,
  ): Promise<User> {
    context.userByIdLoader ??= this.usersService.createByIdLoader();
    return context.userByIdLoader.load(tweet.authorId);
  }
}
