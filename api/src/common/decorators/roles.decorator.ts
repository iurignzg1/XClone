import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../modules/users/domain/user-role.enum.js';

export const ROLES_KEY = 'roles';

// Restringe a operação aos papéis informados. Sem @Roles, qualquer usuário
// logado pode usar.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
