import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

@ArgsType()
export class UserTweetsArgs {
  @Field()
  @IsString()
  @Length(1, 15)
  username: string;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}
