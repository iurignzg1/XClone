import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

// Global (APP_GUARD): conta as chamadas de cada operação por IP e recusa com
// 429 (TOO_MANY_REQUESTS) quem passa do limite.
// O ThrottlerGuard original procura o req e o res no contexto HTTP; numa
// operação GraphQL eles estão no contexto do GraphQL (ver o `context` do
// GraphQLModule), então ensinamos o guard a buscar lá.
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    if (context.getType<GqlContextType>() === 'graphql') {
      const { req, res } = GqlExecutionContext.create(context).getContext<{
        req: Request;
        res: Response;
      }>();
      return { req, res };
    }
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Request>(),
      res: http.getResponse<Response>(),
    };
  }
}
