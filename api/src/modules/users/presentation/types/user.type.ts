import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '../../domain/user-role.enum.js';

registerEnumType(UserRole, { name: 'UserRole' });

// Perfil público: o que qualquer usuário logado pode ver de outro. Sem e-mail.
// O passwordHash não é um @Field, então nunca sai na API.
@ObjectType('User')
export class UserType {
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
