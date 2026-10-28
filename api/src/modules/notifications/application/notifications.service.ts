import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  USER_FOLLOWED,
  USER_UNFOLLOWED,
  type FollowEvent,
} from '../../follows/domain/follow.events.js';
import {
  TWEET_LIKED,
  TWEET_UNLIKED,
  type LikeEvent,
} from '../../likes/domain/like.events.js';
import {
  REPLY_CREATED,
  type ReplyCreatedEvent,
} from '../../tweets/domain/reply-created.event.js';
import {
  TWEET_DELETED,
  type TweetDeletedEvent,
} from '../../tweets/domain/tweet-deleted.event.js';
import {
  NotificationType,
  type NotificationEvent,
  type NotificationGroup,
} from '../domain/notification.entity.js';
import { NotificationRepository } from '../domain/notification.repository.js';

// As notificações não são pedidas por ninguém: elas nascem dos eventos que os
// outros módulos anunciam (curtiu, respondeu, seguiu). Nenhum desses módulos
// sabe que este existe.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  list(userId: string, limit: number): Promise<NotificationGroup[]> {
    return this.notificationRepository.findGroups(userId, limit);
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationRepository.countUnreadGroups(userId);
  }

  markAllRead(userId: string): Promise<void> {
    return this.notificationRepository.markAllRead(userId);
  }

  @OnEvent(TWEET_LIKED)
  handleLiked(event: LikeEvent): Promise<void> {
    return this.notify(this.fromLike(event));
  }

  // Descurtiu: o aviso some. Curtir e descurtir várias vezes nunca acumula.
  @OnEvent(TWEET_UNLIKED)
  handleUnliked(event: LikeEvent): Promise<void> {
    return this.safely(() =>
      this.notificationRepository.remove(this.fromLike(event)),
    );
  }

  @OnEvent(REPLY_CREATED)
  handleReply(event: ReplyCreatedEvent): Promise<void> {
    return this.notify({
      type: NotificationType.REPLY,
      recipientId: event.parentAuthorId,
      actorId: event.authorId,
      tweetId: event.replyId,
    });
  }

  @OnEvent(USER_FOLLOWED)
  handleFollowed(event: FollowEvent): Promise<void> {
    return this.notify(this.fromFollow(event));
  }

  // Deixar de seguir não avisa ninguém (de propósito): só apaga o aviso de
  // "começou a seguir", se ainda existir. Seguir e desfazer várias vezes gera
  // no máximo um aviso.
  @OnEvent(USER_UNFOLLOWED)
  handleUnfollowed(event: FollowEvent): Promise<void> {
    return this.safely(() =>
      this.notificationRepository.remove(this.fromFollow(event)),
    );
  }

  // Pio apagado: some o aviso das curtidas dele e o da resposta (se era uma).
  @OnEvent(TWEET_DELETED)
  handleTweetDeleted(event: TweetDeletedEvent): Promise<void> {
    return this.safely(() =>
      this.notificationRepository.removeAllForTweet(event.tweetId),
    );
  }

  // Ninguém é avisado do que fez a si mesmo (curtir ou responder o próprio pio).
  private notify(event: NotificationEvent): Promise<void> {
    if (event.actorId === event.recipientId) return Promise.resolve();
    return this.safely(() => this.notificationRepository.add(event));
  }

  // A notificação é um efeito colateral: se ela falhar, a curtida (ou o
  // seguir, a resposta) já aconteceu e não deve dar erro para quem fez.
  private async safely(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.error('Falha ao atualizar notificações', error);
    }
  }

  private fromLike(event: LikeEvent): NotificationEvent {
    return {
      type: NotificationType.LIKE,
      recipientId: event.tweetAuthorId,
      actorId: event.userId,
      tweetId: event.tweetId,
    };
  }

  private fromFollow(event: FollowEvent): NotificationEvent {
    return {
      type: NotificationType.FOLLOW,
      recipientId: event.followedId,
      actorId: event.followerId,
      tweetId: null,
    };
  }
}
