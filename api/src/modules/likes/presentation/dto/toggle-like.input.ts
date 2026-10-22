import { Field, ID, InputType } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

@InputType()
export class ToggleLikeInput {
  @Field(() => ID)
  @IsMongoId()
  tweetId: string;
}
