import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
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

  // O _id do vínculo nasce com a data em que ele foi criado: ordenar por ele
  // dá do mais recente para o mais antigo.
  async listFollowerIds(userId: string, limit: number): Promise<string[]> {
    const docs = await this.followModel
      .find({ followingId: userId })
      .sort({ _id: -1 })
      .limit(limit)
      .select('followerId');
    return docs.map((doc) => doc.followerId.toString());
  }

  async listFollowingIds(userId: string, limit: number): Promise<string[]> {
    const docs = await this.followModel
      .find({ followerId: userId })
      .sort({ _id: -1 })
      .limit(limit)
      .select('followingId');
    return docs.map((doc) => doc.followingId.toString());
  }

  async findFollowedIds(
    followerId: string,
    userIds: string[],
  ): Promise<string[]> {
    const docs = await this.followModel
      .find({ followerId, followingId: { $in: userIds } })
      .select('followingId');
    return docs.map((doc) => doc.followingId.toString());
  }

  countFollowers(userIds: string[]): Promise<Map<string, number>> {
    return this.countBy('followingId', userIds);
  }

  countFollowing(userIds: string[]): Promise<Map<string, number>> {
    return this.countBy('followerId', userIds);
  }

  async remove(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.followModel.deleteOne({
      followerId,
      followingId,
    });
    return result.deletedCount === 1;
  }

  // Agrupa os vínculos pelo campo pedido e conta, tudo dentro do Mongo.
  private async countBy(
    field: 'followerId' | 'followingId',
    userIds: string[],
  ): Promise<Map<string, number>> {
    // Diferente do find, o aggregate não converte texto em ObjectId sozinho.
    const ids = userIds
      .filter((id) => isValidObjectId(id))
      .map((id) => new Types.ObjectId(id));
    const rows = await this.followModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { [field]: { $in: ids } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }
}
