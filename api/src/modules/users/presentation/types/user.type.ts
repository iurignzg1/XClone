import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '../../domain/user-role.enum.js';

registerEnumType(UserRole, { name: 'UserRole' });

// Só expõe o que é seguro: passwordHash não é um @Field, então nunca sai na API.
@ObjectType('User')
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  email: string;

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
