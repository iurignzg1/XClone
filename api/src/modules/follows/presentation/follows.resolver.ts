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
import type { User } from '../../users/domain/user.entity.js';
import { UserType } from '../../users/presentation/types/user.type.js';
import { FollowsService } from '../application/follows.service.js';
import { FollowListArgs } from './dto/follow-list.args.js';
import { FollowUserInput } from './dto/follow-user.input.js';

// O contexto do GraphQL vive uma requisição inteira: é onde guardamos os loaders.
interface FollowsGqlContext {
  followersCountLoader?: DataLoader<string, number>;
  followingCountLoader?: DataLoader<string, number>;
  followedByMeLoader?: DataLoader<string, boolean>;
}

// Além das mutations, "estende" o tipo User com os campos de follows, para o
// módulo de usuários não depender deste (o caminho contrário já existe).
@Resolver(() => UserType)
export class FollowsResolver {
  constructor(private readonly followsService: FollowsService) {}

  // O usuário logado segue esta pessoa? (No próprio perfil, sempre false.)
  @ResolveField(() => Boolean)
  followedByMe(
    @Parent() user: User,
    @CurrentUser() viewer: User,
    @Context() context: FollowsGqlContext,
  ): Promise<boolean> {
    context.followedByMeLoader ??= this.followsService.createFollowedByMeLoader(
      viewer.id,
    );
    return context.followedByMeLoader.load(user.id);
  }

  @ResolveField(() => Int)
  followersCount(
    @Parent() user: User,
    @Context() context: FollowsGqlContext,
  ): Promise<number> {
    context.followersCountLoader ??=
      this.followsService.createFollowersCountLoader();
    return context.followersCountLoader.load(user.id);
  }

  @ResolveField(() => Int)
  followingCount(
    @Parent() user: User,
    @Context() context: FollowsGqlContext,
  ): Promise<number> {
    context.followingCountLoader ??=
      this.followsService.createFollowingCountLoader();
    return context.followingCountLoader.load(user.id);
  }

  // Quem segue o perfil (aba "seguidores").
  @Query(() => [UserType])
  followers(@Args() args: FollowListArgs): Promise<User[]> {
    return this.followsService.getFollowers(args.username, args.limit);
  }

  // Quem o perfil segue (aba "seguindo").
  @Query(() => [UserType])
  following(@Args() args: FollowListArgs): Promise<User[]> {
    return this.followsService.getFollowing(args.username, args.limit);
  }

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
