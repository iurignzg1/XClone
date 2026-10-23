import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { UserRole } from '../domain/user-role.enum.js';
import type { User } from '../domain/user.entity.js';
import { UsersService } from '../application/users.service.js';
import { SuspendUserInput } from './dto/suspend-user.input.js';
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

  @Query(() => UserType)
  userByUsername(@Args() args: UserByUsernameArgs): Promise<User> {
    return this.usersService.getByUsername(args.username);
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => UserType)
  suspendUser(
    @CurrentUser() admin: User,
    @Args('input') input: SuspendUserInput,
  ): Promise<User> {
    return this.usersService.suspend(admin.id, input.userId);
  }
}
