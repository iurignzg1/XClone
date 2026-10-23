import { Module } from '@nestjs/common';
import { FollowsModule } from '../follows/follows.module.js';
import { TweetsModule } from '../tweets/tweets.module.js';
import { FeedService } from './application/feed.service.js';
import { FeedResolver } from './presentation/feed.resolver.js';

@Module({
  imports: [FollowsModule, TweetsModule],
  providers: [FeedService, FeedResolver],
})
export class FeedModule {}
