import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { OPTIONAL_AUTH_KEY } from '../../../../common/decorators/optional-auth.decorator.js';
import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator.js';

// Registrado como APP_GUARD: tudo exige JWT, exceto o que tem @Public().
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    // Aberta a visitantes: sem o cabeçalho Authorization, passa sem usuário.
    // Com o cabeçalho, segue para a conferência normal do token.
    const isOptional = this.reflector.getAllAndOverride<boolean | undefined>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptional && !this.getRequest(context).headers.authorization) {
      return true;
    }
    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext): Request {
    if (context.getType<GqlContextType>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: Request }>()
        .req;
    }
    return context.switchToHttp().getRequest<Request>();
  }
}
