import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { NotificationType } from '../domain/notification.entity.js';

@Schema({
  collection: 'notifications',
  timestamps: { createdAt: true, updatedAt: false },
})
export class NotificationModel {
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  recipientId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  actorId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  tweetId: Types.ObjectId | null;

  // null até a pessoa abrir a página de notificações.
  @Prop({ type: Date, default: null })
  readAt: Date | null;

  createdAt: Date;
}

export type NotificationDocument = HydratedDocument<NotificationModel>;
export const NotificationSchema =
  SchemaFactory.createForClass(NotificationModel);

// O mesmo acontecimento só existe uma vez (curtir, descurtir e curtir de novo
// não acumula avisos): o banco garante.
NotificationSchema.index(
  { recipientId: 1, type: 1, actorId: 1, tweetId: 1 },
  { unique: true },
);
// A página lista as notificações de uma pessoa, das mais novas às mais antigas.
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
// Pio apagado: as notificações dele somem.
NotificationSchema.index({ tweetId: 1 });
