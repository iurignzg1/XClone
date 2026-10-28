import type {
  NotificationEvent,
  NotificationGroup,
} from './notification.entity.js';

export abstract class NotificationRepository {
  // Idempotente: o mesmo acontecimento nunca é gravado duas vezes.
  abstract add(event: NotificationEvent): Promise<void>;
  // Desfaz um acontecimento (ex.: descurtiu, deixou de seguir).
  abstract remove(event: NotificationEvent): Promise<void>;
  abstract removeAllForTweet(tweetId: string): Promise<void>;
  // Grupos mais recentes primeiro (ver NotificationGroup).
  abstract findGroups(
    recipientId: string,
    limit: number,
  ): Promise<NotificationGroup[]>;
  // Quantas linhas da página têm algo não visto.
  abstract countUnreadGroups(recipientId: string): Promise<number>;
  abstract markAllRead(recipientId: string): Promise<void>;
}
