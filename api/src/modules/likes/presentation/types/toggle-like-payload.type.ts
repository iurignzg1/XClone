import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ToggleLikePayload {
  // true = o tweet ficou curtido; false = a curtida foi removida.
  @Field()
  liked: boolean;

  @Field(() => Int)
  likesCount: number;
}
