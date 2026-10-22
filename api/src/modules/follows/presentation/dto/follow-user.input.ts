import { Field, ID, InputType } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

@InputType()
export class FollowUserInput {
  @Field(() => ID)
  @IsMongoId()
  userId: string;
}
