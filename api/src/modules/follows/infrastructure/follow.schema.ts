import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({
  collection: 'follows',
  timestamps: { createdAt: true, updatedAt: false },
})
export class FollowModel {
  // Quem segue.
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  followerId: Types.ObjectId;

  // Quem é seguido.
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  followingId: Types.ObjectId;

  createdAt: Date;
}

export type FollowDocument = HydratedDocument<FollowModel>;
export const FollowSchema = SchemaFactory.createForClass(FollowModel);

// Seguir a mesma pessoa duas vezes não cria dois vínculos: o banco garante.
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
