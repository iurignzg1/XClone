import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LikeRepository } from '../domain/like.repository.js';
import { LikeModel } from './like.schema.js';

@Injectable()
export class MongoLikeRepository extends LikeRepository {
  constructor(
    @InjectModel(LikeModel.name) private readonly likeModel: Model<LikeModel>,
  ) {
    super();
  }

  // Upsert: cria só se ainda não existe, numa única operação atômica.
  async add(userId: string, tweetId: string): Promise<boolean> {
    const result = await this.likeModel.updateOne(
      { userId, tweetId },
      { $setOnInsert: { userId, tweetId } },
      { upsert: true },
    );
    return result.upsertedCount === 1;
  }

  async remove(userId: string, tweetId: string): Promise<boolean> {
    const result = await this.likeModel.deleteOne({ userId, tweetId });
    return result.deletedCount === 1;
  }
}
