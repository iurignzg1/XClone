import { Field, ObjectType } from '@nestjs/graphql';
import { BaseUserType } from './user.type.js';

// A conta do próprio usuário: os campos de cadastro mais os dados privados
// (e-mail). Não herda do User de propósito: os campos calculados que outros
// módulos acrescentam ao User (contadores, followedByMe) só têm resolver lá.
// Os números do próprio perfil vêm de userByUsername.
@ObjectType('Me')
export class MeType extends BaseUserType {
  @Field()
  email: string;
}
