import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

@ArgsType()
export class FeedArgs {
  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  // Cursor: id do último tweet da página anterior. Sem ele, vem a primeira página.
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  after?: string;
}
