import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@ArgsType()
export class UserByUsernameArgs {
  @Field()
  @IsString()
  @Length(1, 15)
  username: string;
}
