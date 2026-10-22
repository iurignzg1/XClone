import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { TWEET_MAX_LENGTH } from '../domain/tweet.entity.js';

@Schema({
  collection: 'tweets',
  timestamps: { createdAt: true, updatedAt: false },
})
export class TweetModel {
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: TWEET_MAX_LENGTH,
  })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  authorId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  parentId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0, min: 0 })
  likesCount: number;

  createdAt: Date;
}

export type TweetDocument = HydratedDocument<TweetModel>;
export const TweetSchema = SchemaFactory.createForClass(TweetModel);

// Feed e perfil: tweets de um autor, do mais recente para o mais antigo.
TweetSchema.index({ authorId: 1, createdAt: -1 });
// Respostas de um tweet, já na ordem em que são listadas.
TweetSchema.index({ parentId: 1, createdAt: 1 });
