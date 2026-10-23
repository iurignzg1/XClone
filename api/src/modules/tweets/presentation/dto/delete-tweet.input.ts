import { Field, ID, InputType } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

@InputType()
export class DeleteTweetInput {
  @Field(() => ID)
  @IsMongoId()
  tweetId: string;
}
