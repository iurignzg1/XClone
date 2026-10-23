import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { UserRole } from '../../modules/users/domain/user-role.enum.js';
import type { User } from '../../modules/users/domain/user.entity.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

// Global (APP_GUARD), registrado depois do GqlAuthGuard: quando ele roda, o
// usuário já foi autenticado e está em req.user.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;

    const { req } = GqlExecutionContext.create(context).getContext<{
      req: { user?: User };
    }>();
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenException('Você não tem permissão para esta ação');
    }
    return true;
  }
}
