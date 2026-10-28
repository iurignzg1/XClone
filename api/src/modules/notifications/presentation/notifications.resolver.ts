import {
  Args,
  Context,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type DataLoader from 'dataloader';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';
import { TweetType } from '../../tweets/presentation/types/tweet.type.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { UserType } from '../../users/presentation/types/user.type.js';
import { NotificationsService } from '../application/notifications.service.js';
import type { NotificationGroup } from '../domain/notification.entity.js';
import { NotificationsArgs } from './dto/notifications.args.js';
import { NotificationGqlType } from './types/notification.type.js';

// O mesmo contexto de requisição dos outros resolvers: o userByIdLoader é
// compartilhado com o `author` dos pios.
interface NotificationsGqlContext {
  userByIdLoader?: DataLoader<string, User>;
  tweetByIdLoader?: DataLoader<string, Tweet | null>;
}

// Tudo aqui é da pessoa logada: ninguém lê as notificações de outra.
@Resolver(() => NotificationGqlType)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly tweetsService: TweetsService,
  ) {}

  @Query(() => [NotificationGqlType])
  notifications(
    @CurrentUser() user: User,
    @Args() args: NotificationsArgs,
  ): Promise<NotificationGroup[]> {
    return this.notificationsService.list(user.id, args.limit);
  }

  // O número no sino do menu: quantas linhas da página têm novidade.
  @Query(() => Int)
  unreadNotificationsCount(@CurrentUser() user: User): Promise<number> {
    return this.notificationsService.countUnread(user.id);
  }

  @Mutation(() => Boolean)
  async markNotificationsRead(@CurrentUser() user: User): Promise<boolean> {
    await this.notificationsService.markAllRead(user.id);
    return true;
  }

  // Quem fez, mais recente primeiro. Com o loader, as pessoas de todas as
  // linhas vêm numa consulta só.
  @ResolveField(() => [UserType])
  async actors(
    @Parent() notification: NotificationGroup,
    @Context() context: NotificationsGqlContext,
  ): Promise<User[]> {
    context.userByIdLoader ??= this.usersService.createByIdLoader();
    const users = await context.userByIdLoader.loadMany(notification.actorIds);
    return users.filter((user): user is User => !(user instanceof Error));
  }

  // O pio curtido ou a resposta; null para "começou a seguir".
  @ResolveField(() => TweetType, { nullable: true })
  tweet(
    @Parent() notification: NotificationGroup,
    @Context() context: NotificationsGqlContext,
  ): Promise<Tweet | null> {
    if (!notification.tweetId) return Promise.resolve(null);
    context.tweetByIdLoader ??= this.tweetsService.createByIdLoader();
    return context.tweetByIdLoader.load(notification.tweetId);
  }
}
