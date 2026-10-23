import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({
  collection: 'sessions',
  timestamps: { createdAt: true, updatedAt: false },
})
export class SessionModel {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  tokenHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: String, default: '' })
  userAgent: string;

  @Prop({ type: Date, required: true })
  loginAt: Date;

  createdAt: Date;
}

export type SessionDocument = HydratedDocument<SessionModel>;
export const SessionSchema = SchemaFactory.createForClass(SessionModel);

// TTL: o Mongo apaga a sessão sozinho quando expiresAt passa.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
