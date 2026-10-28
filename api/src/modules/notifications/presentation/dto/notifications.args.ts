import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@ArgsType()
export class NotificationsArgs {
  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number;
}
