import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@ArgsType()
export class SuggestionsArgs {
  @Field(() => Int, { defaultValue: 3 })
  @IsInt()
  @Min(1)
  @Max(10)
  limit: number;
}
