import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class SignupInput {
  @Field()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,15}$/, {
    message: 'username deve ter 3 a 15 caracteres: letras, números e _',
  })
  username: string;

  @Field()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @Field()
  @IsString()
  @Length(1, 50)
  displayName: string;
}
