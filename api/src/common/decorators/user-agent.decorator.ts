import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

export const UserAgent = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    GqlExecutionContext.create(context).getContext<{ req: Request }>().req
      .headers['user-agent'] ?? '',
);
