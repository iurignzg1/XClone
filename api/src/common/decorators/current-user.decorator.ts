import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { User } from '../../modules/users/domain/user.entity.js';

// Usuário que o JwtStrategy colocou em req.user.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    GqlExecutionContext.create(context).getContext<{ req: { user: User } }>()
      .req.user,
);
