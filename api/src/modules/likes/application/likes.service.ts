import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import DataLoader from 'dataloader';
import { TweetsService } from '../../tweets/application/tweets.service.js';
import {
  TWEET_DELETED,
  type TweetDeletedEvent,
} from '../../tweets/domain/tweet-deleted.event.js';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
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
    private readonly usersService: UsersService,
  ) {}

  // Quem curtiu o tweet, da curtida mais recente para a mais antiga.
  async getLikers(tweetId: string, limit: number): Promise<User[]> {
    await this.tweetsService.findById(tweetId);
    const userIds = await this.likeRepository.findLikerIds(tweetId, limit);
    const users = await this.usersService.findByIds(userIds);
    // O banco devolve os usuários em qualquer ordem: refaz a ordem das curtidas.
    const byId = new Map(users.map((user) => [user.id, user]));
    return userIds.flatMap((id) => byId.get(id) ?? []);
  }

  // Um loader por requisição: junta todos os `likedByMe` pedidos na mesma
  // resposta numa única consulta, em vez de uma consulta por tweet (N+1).
  createLikedByMeLoader(userId: string): DataLoader<string, boolean> {
    return new DataLoader<string, boolean>(async (tweetIds) => {
      const liked = new Set(
        await this.likeRepository.findLikedTweetIds(userId, [...tweetIds]),
      );
      return tweetIds.map((id) => liked.has(id));
    });
  }

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

  // Tweet apagado: as curtidas dele não servem mais para nada.
  @OnEvent(TWEET_DELETED)
  async handleTweetDeleted(event: TweetDeletedEvent): Promise<void> {
    await this.likeRepository.removeAllForTweet(event.tweetId);
  }
}
