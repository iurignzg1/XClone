import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Tweet')
export class TweetType {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field(() => ID)
  authorId: string;

  @Field(() => ID, { nullable: true })
  parentId: string | null;

  @Field(() => Int)
  likesCount: number;

  @Field()
  createdAt: Date;
}
