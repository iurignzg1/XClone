import { Field, ObjectType } from '@nestjs/graphql';
import { UserType } from './user.type.js';

// O próprio usuário: o perfil público mais os dados privados dele (e-mail).
@ObjectType('Me')
export class MeType extends UserType {
  @Field()
  email: string;
}
