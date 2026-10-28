import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator.js';
import { UserRole } from '../../modules/users/domain/user-role.enum.js';
import type { User } from '../../modules/users/domain/user.entity.js';
import { RolesGuard } from './roles.guard.js';

class Resolver {
  @Roles(UserRole.ADMIN)
  somenteAdmin() {}

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  moderacao() {}

  qualquerUsuario() {}
}

// Um contexto de execução mínimo, no formato que o GraphQL entrega.
function contextFor(handler: () => void, user?: Partial<User>) {
  const args = [{}, {}, { req: { user } }, {}];
  return {
    getHandler: () => handler,
    getClass: () => Resolver,
    getType: () => 'graphql',
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
  } as unknown as ExecutionContext;
}

// O guard lê o metadado do método (não chama o método), então aqui só
// precisamos da referência a ele.
/* eslint-disable @typescript-eslint/unbound-method */
const handlers = {
  somenteAdmin: Resolver.prototype.somenteAdmin,
  moderacao: Resolver.prototype.moderacao,
  qualquerUsuario: Resolver.prototype.qualquerUsuario,
};
/* eslint-enable @typescript-eslint/unbound-method */

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('libera operações sem @Roles para qualquer usuário logado', () => {
    const context = contextFor(handlers.qualquerUsuario, {
      role: UserRole.USER,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('libera o papel exigido', () => {
    const context = contextFor(handlers.somenteAdmin, {
      role: UserRole.ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('barra um papel diferente do exigido', () => {
    const context = contextFor(handlers.somenteAdmin, {
      role: UserRole.MODERATOR,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('aceita qualquer um dos papéis listados', () => {
    const moderator = contextFor(handlers.moderacao, {
      role: UserRole.MODERATOR,
    });
    const admin = contextFor(handlers.moderacao, { role: UserRole.ADMIN });
    const user = contextFor(handlers.moderacao, { role: UserRole.USER });

    expect(guard.canActivate(moderator)).toBe(true);
    expect(guard.canActivate(admin)).toBe(true);
    expect(() => guard.canActivate(user)).toThrow(ForbiddenException);
  });

  it('barra quando não há usuário na requisição', () => {
    const context = contextFor(handlers.somenteAdmin, undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
