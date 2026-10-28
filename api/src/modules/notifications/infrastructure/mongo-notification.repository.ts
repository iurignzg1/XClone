import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationType,
  type NotificationEvent,
  type NotificationGroup,
} from '../domain/notification.entity.js';
import { NotificationRepository } from '../domain/notification.repository.js';
import { NotificationModel } from './notification.schema.js';

// Quantas pessoas de cada grupo vêm com nome (o resto vira "e mais N").
const ACTORS_PER_GROUP = 3;

// A chave que junta as notificações numa linha: curtidas do mesmo pio ficam
// juntas; o resto fica sozinho (a chave é o próprio _id).
const GROUP_KEY = {
  $cond: [
    { $eq: ['$type', NotificationType.LIKE] },
    { likedTweet: '$tweetId' },
    { single: '$_id' },
  ],
};

interface GroupRow {
  firstId: Types.ObjectId;
  type: NotificationType;
  tweetId: Types.ObjectId | null;
  actorIds: Types.ObjectId[];
  actorsCount: number;
  createdAt: Date;
  unread: boolean;
}

@Injectable()
export class MongoNotificationRepository extends NotificationRepository {
  constructor(
    @InjectModel(NotificationModel.name)
    private readonly notificationModel: Model<NotificationModel>,
  ) {
    super();
  }

  // Upsert: cria só se ainda não existe, numa única operação atômica.
  async add(event: NotificationEvent): Promise<void> {
    const filter = this.toFilter(event);
    await this.notificationModel.updateOne(
      filter,
      { $setOnInsert: filter },
      { upsert: true },
    );
  }

  async remove(event: NotificationEvent): Promise<void> {
    await this.notificationModel.deleteOne(this.toFilter(event));
  }

  async removeAllForTweet(tweetId: string): Promise<void> {
    await this.notificationModel.deleteMany({ tweetId });
  }

  async findGroups(
    recipientId: string,
    limit: number,
  ): Promise<NotificationGroup[]> {
    const rows = await this.notificationModel.aggregate<GroupRow>([
      { $match: { recipientId: new Types.ObjectId(recipientId) } },
      // Mais recentes primeiro, para o $first e o $push pegarem nessa ordem.
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: GROUP_KEY,
          firstId: { $first: '$_id' },
          type: { $first: '$type' },
          tweetId: { $first: '$tweetId' },
          actorIds: { $push: '$actorId' },
          actorsCount: { $sum: 1 },
          createdAt: { $first: '$createdAt' },
          unread: { $max: { $eq: [{ $ifNull: ['$readAt', null] }, null] } },
        },
      },
      { $sort: { createdAt: -1, firstId: -1 } },
      { $limit: limit },
      {
        $set: { actorIds: { $slice: ['$actorIds', ACTORS_PER_GROUP] } },
      },
    ]);
    return rows.map((row) => ({
      // Grupo de curtidas: o id é o do pio, que não muda quando chega mais
      // uma curtida (o front atualiza a mesma linha no cache).
      id:
        row.type === NotificationType.LIKE
          ? `like-${row.tweetId?.toString()}`
          : row.firstId.toString(),
      type: row.type,
      tweetId: row.tweetId?.toString() ?? null,
      actorIds: row.actorIds.map((id) => id.toString()),
      actorsCount: row.actorsCount,
      createdAt: row.createdAt,
      read: !row.unread,
    }));
  }

  async countUnreadGroups(recipientId: string): Promise<number> {
    const [result] = await this.notificationModel.aggregate<{
      total: number;
    }>([
      {
        $match: { recipientId: new Types.ObjectId(recipientId), readAt: null },
      },
      { $group: { _id: GROUP_KEY } },
      { $count: 'total' },
    ]);
    return result?.total ?? 0;
  }

  async markAllRead(recipientId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipientId, readAt: null },
      { $set: { readAt: new Date() } },
    );
  }

  private toFilter(event: NotificationEvent) {
    return {
      type: event.type,
      recipientId: new Types.ObjectId(event.recipientId),
      actorId: new Types.ObjectId(event.actorId),
      tweetId: event.tweetId ? new Types.ObjectId(event.tweetId) : null,
    };
  }
}
