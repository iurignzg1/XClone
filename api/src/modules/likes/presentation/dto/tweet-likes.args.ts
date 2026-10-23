import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';

@ArgsType()
export class TweetLikesArgs {
  @Field(() => ID)
  @IsMongoId()
  tweetId: string;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}
