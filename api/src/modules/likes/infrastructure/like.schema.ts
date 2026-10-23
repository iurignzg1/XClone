import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({
  collection: 'likes',
  timestamps: { createdAt: true, updatedAt: false },
})
export class LikeModel {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  tweetId: Types.ObjectId;

  createdAt: Date;
}

export type LikeDocument = HydratedDocument<LikeModel>;
export const LikeSchema = SchemaFactory.createForClass(LikeModel);

// Um usuário só pode curtir um tweet uma vez: o banco garante.
LikeSchema.index({ userId: 1, tweetId: 1 }, { unique: true });
// Quem curtiu um tweet, já na ordem em que é listado (mais recentes primeiro).
LikeSchema.index({ tweetId: 1, createdAt: -1 });
