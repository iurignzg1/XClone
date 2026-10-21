import { Field, ObjectType } from '@nestjs/graphql';
import { UserType } from '../../../users/presentation/types/user.type.js';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field(() => UserType)
  user: UserType;
}
