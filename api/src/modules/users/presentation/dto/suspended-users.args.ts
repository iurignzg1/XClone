import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@ArgsType()
export class SuspendedUsersArgs {
  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}
