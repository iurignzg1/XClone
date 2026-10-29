import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { User } from '../../modules/users/domain/user.entity.js';

// Usuário que o JwtStrategy colocou em req.user.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    GqlExecutionContext.create(context).getContext<{ req: { user: User } }>()
      .req.user,
);

// Quem está vendo, em operações abertas a visitantes (@OptionalAuth): o
// usuário logado, ou undefined para o visitante.
export const Viewer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | undefined =>
    GqlExecutionContext.create(context).getContext<{
      req: { user?: User };
    }>().req.user,
);
