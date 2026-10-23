import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FollowRepository } from '../domain/follow.repository.js';
import { FollowModel } from './follow.schema.js';

@Injectable()
export class MongoFollowRepository extends FollowRepository {
  constructor(
    @InjectModel(FollowModel.name)
    private readonly followModel: Model<FollowModel>,
  ) {
    super();
  }

  // Upsert: cria só se ainda não existe, numa única operação atômica.
  async add(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.followModel.updateOne(
      { followerId, followingId },
      { $setOnInsert: { followerId, followingId } },
      { upsert: true },
    );
    return result.upsertedCount === 1;
  }

  async findFollowingIds(followerId: string): Promise<string[]> {
    const docs = await this.followModel
      .find({ followerId })
      .select('followingId');
    return docs.map((doc) => doc.followingId.toString());
  }

  async remove(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.followModel.deleteOne({
      followerId,
      followingId,
    });
    return result.deletedCount === 1;
  }
}
