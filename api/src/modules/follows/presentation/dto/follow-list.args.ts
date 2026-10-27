import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

// Argumentos das listas de seguidores e de quem a pessoa segue.
@ArgsType()
export class FollowListArgs {
  @Field()
  @IsString()
  @Length(1, 15)
  username: string;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}
