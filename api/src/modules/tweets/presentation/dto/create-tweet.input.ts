import { Field, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';
import { TWEET_MAX_LENGTH } from '../../domain/tweet.entity.js';

@InputType()
export class CreateTweetInput {
  // O trim vem antes das regras: um texto só de espaços vira vazio e é recusado.
  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, TWEET_MAX_LENGTH)
  content: string;

  // Id do tweet que está sendo respondido (opcional).
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
