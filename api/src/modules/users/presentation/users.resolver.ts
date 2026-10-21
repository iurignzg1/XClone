import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { User } from '../domain/user.entity.js';
import { UserType } from './types/user.type.js';

@Resolver(() => UserType)
export class UsersResolver {
  @Query(() => UserType)
  me(@CurrentUser() user: User): User {
    return user;
  }
}
