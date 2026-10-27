import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { UserRole } from '../domain/user-role.enum.js';
import type { User } from '../domain/user.entity.js';
import { UsersService } from '../application/users.service.js';
import { SearchUsersArgs } from './dto/search-users.args.js';
import { SuspendUserInput } from './dto/suspend-user.input.js';
import { SuspendedUsersArgs } from './dto/suspended-users.args.js';
import { UnsuspendUserInput } from './dto/unsuspend-user.input.js';
import { UpdateProfileInput } from './dto/update-profile.input.js';
import { UserByUsernameArgs } from './dto/user-by-username.args.js';
import { MeType } from './types/me.type.js';
import { UserType } from './types/user.type.js';

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => MeType)
  me(@CurrentUser() user: User): User {
    return user;
  }

  // Barra de pesquisa: pessoas pelo @ ou pelo nome.
  @Query(() => [UserType])
  searchUsers(@Args() args: SearchUsersArgs): Promise<User[]> {
    return this.usersService.search(args.query, args.limit);
  }

  @Query(() => UserType)
  userByUsername(@Args() args: UserByUsernameArgs): Promise<User> {
    return this.usersService.getByUsername(args.username);
  }

  // Muda o nome de exibição, a bio e a capa de quem está logado (e só dele).
  @Mutation(() => MeType)
  updateProfile(
    @CurrentUser() user: User,
    @Args('input') input: UpdateProfileInput,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, {
      displayName: input.displayName,
      bio: input.bio,
      cover: input.cover,
    });
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => UserType)
  suspendUser(
    @CurrentUser() admin: User,
    @Args('input') input: SuspendUserInput,
  ): Promise<User> {
    return this.usersService.suspend(admin.id, input.userId);
  }

  // Página de administração: as contas suspensas.
  @Roles(UserRole.ADMIN)
  @Query(() => [UserType])
  suspendedUsers(@Args() args: SuspendedUsersArgs): Promise<User[]> {
    return this.usersService.listSuspended(args.limit);
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => UserType)
  unsuspendUser(@Args('input') input: UnsuspendUserInput): Promise<User> {
    return this.usersService.unsuspend(input.userId);
  }
}
