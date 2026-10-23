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

  async findLikerIds(tweetId: string, limit: number): Promise<string[]> {
    const docs = await this.likeModel
      .find({ tweetId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('userId');
    return docs.map((doc) => doc.userId.toString());
  }

  async findLikedTweetIds(
    userId: string,
    tweetIds: string[],
  ): Promise<string[]> {
    const docs = await this.likeModel
      .find({ userId, tweetId: { $in: tweetIds } })
      .select('tweetId');
    return docs.map((doc) => doc.tweetId.toString());
  }

  async remove(userId: string, tweetId: string): Promise<boolean> {
    const result = await this.likeModel.deleteOne({ userId, tweetId });
    return result.deletedCount === 1;
  }
}
