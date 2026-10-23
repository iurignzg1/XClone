import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '../../domain/user-role.enum.js';

registerEnumType(UserRole, { name: 'UserRole' });

// Campos de cadastro, comuns ao User e ao Me. É abstrata: não vira um tipo no
// schema, só empresta os campos. O passwordHash não é um @Field, então nunca
// sai na API.
@ObjectType({ isAbstract: true })
export abstract class BaseUserType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  displayName: string;

  @Field()
  bio: string;

  @Field(() => UserRole)
  role: UserRole;

  @Field()
  suspended: boolean;

  @Field()
  createdAt: Date;
}

// Perfil público: o que qualquer usuário logado pode ver de outro. Sem e-mail.
// Outros módulos acrescentam campos calculados a ele (ex.: os contadores de
// seguidores, no FollowsResolver).
@ObjectType('User')
export class UserType extends BaseUserType {}
