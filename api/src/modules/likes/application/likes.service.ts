import { Injectable } from '@nestjs/common';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import { LikeRepository } from '../domain/like.repository.js';

export interface ToggleLikeResult {
  liked: boolean;
  likesCount: number;
}

@Injectable()
export class LikesService {
  constructor(
    private readonly likeRepository: LikeRepository,
    private readonly tweetsService: TweetsService,
  ) {}

  // Curte se ainda não curtiu; descurte se já curtiu. O contador só muda quando
  // a curtida realmente foi criada ou removida, então duas requisições
  // simultâneas nunca duplicam a curtida nem desajustam o contador.
  async toggle(userId: string, tweetId: string): Promise<ToggleLikeResult> {
    const tweet = await this.tweetsService.findById(tweetId);

    const removed = await this.likeRepository.remove(userId, tweetId);
    if (removed) {
      const updated = await this.tweetsService.addLikes(tweetId, -1);
      return { liked: false, likesCount: updated?.likesCount ?? 0 };
    }

    const added = await this.likeRepository.add(userId, tweetId);
    if (added) {
      const updated = await this.tweetsService.addLikes(tweetId, 1);
      return {
        liked: true,
        likesCount: updated?.likesCount ?? tweet.likesCount,
      };
    }

    // Outra requisição curtiu primeiro: o contador já foi atualizado por ela.
    const current = await this.tweetsService.findById(tweetId);
    return { liked: true, likesCount: current.likesCount };
  }
}
