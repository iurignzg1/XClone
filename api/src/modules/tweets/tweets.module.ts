import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TweetsService } from './application/tweets.service.js';
import { TweetRepository } from './domain/tweet.repository.js';
import { MongoTweetRepository } from './infrastructure/mongo-tweet.repository.js';
import { TweetModel, TweetSchema } from './infrastructure/tweet.schema.js';
import { TweetsResolver } from './presentation/tweets.resolver.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TweetModel.name, schema: TweetSchema }]),
  ],
  providers: [
    TweetsService,
    TweetsResolver,
    { provide: TweetRepository, useClass: MongoTweetRepository },
  ],
  exports: [TweetsService],
})
export class TweetsModule {}
