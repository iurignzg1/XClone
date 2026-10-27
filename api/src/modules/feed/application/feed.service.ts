import { Injectable } from '@nestjs/common';
import { FollowsService } from '../../follows/application/follows.service.js';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import type { Tweet } from '../../tweets/domain/tweet.entity.js';

@Injectable()
export class FeedService {
  constructor(
    private readonly followsService: FollowsService,
    private readonly tweetsService: TweetsService,
  ) {}

  // Tweets de quem o usuário segue e os próprios, do mais novo para o mais
  // antigo. `after` é o id do último tweet da página anterior (cursor).
  async getFeed(
    userId: string,
    limit: number,
    after?: string,
  ): Promise<Tweet[]> {
    const followingIds = await this.followsService.getFollowingIds(userId);
    return this.tweetsService.findByAuthors(
      [userId, ...followingIds],
      limit,
      after,
    );
  }
}
