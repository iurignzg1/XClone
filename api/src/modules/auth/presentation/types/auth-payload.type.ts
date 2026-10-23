import { Field, ObjectType } from '@nestjs/graphql';
import { MeType } from '../../../users/presentation/types/me.type.js';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field(() => MeType)
  user: MeType;
}
