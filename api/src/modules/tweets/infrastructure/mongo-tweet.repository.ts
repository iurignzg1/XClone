import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import type { NewTweet, Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';
import { TweetDocument, TweetModel } from './tweet.schema.js';

@Injectable()
export class MongoTweetRepository extends TweetRepository {
  constructor(
    @InjectModel(TweetModel.name)
    private readonly tweetModel: Model<TweetModel>,
  ) {
    super();
  }

  async create(data: NewTweet): Promise<Tweet> {
    const doc = await this.tweetModel.create(data);
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Tweet | null> {
    // Um id mal formado não é erro do sistema: simplesmente não existe.
    if (!isValidObjectId(id)) return null;
    const doc = await this.tweetModel.findById(id);
    return doc && this.toDomain(doc);
  }

  async findReplies(parentId: string, limit: number): Promise<Tweet[]> {
    if (!isValidObjectId(parentId)) return [];
    const docs = await this.tweetModel
      .find({ parentId })
      .sort({ createdAt: 1 })
      .limit(limit);
    return docs.map((doc) => this.toDomain(doc));
  }

  async countReplies(parentIds: string[]): Promise<Map<string, number>> {
    const validIds = parentIds.filter((id) => isValidObjectId(id));
    const rows = await this.tweetModel.aggregate<{
      _id: Types.ObjectId;
      total: number;
    }>([
      {
        $match: {
          parentId: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        },
      },
      { $group: { _id: '$parentId', total: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [row._id.toString(), row.total]));
  }

  async findByAuthors(
    authorIds: string[],
    limit: number,
    after?: string,
  ): Promise<Tweet[]> {
    // Um cursor mal formado não aponta para lugar nenhum: nada depois dele.
    if (after !== undefined && !isValidObjectId(after)) return [];
    // parentId: null filtra só tweets "de topo": respostas ficam no detalhe.
    // Ordena e pagina pelo _id (nasce com a data de criação e nunca empata,
    // ao contrário do createdAt), então o cursor é só o id do último tweet.
    const docs = await this.tweetModel
      .find({
        authorId: { $in: authorIds },
        parentId: null,
        ...(after !== undefined && { _id: { $lt: after } }),
      })
      .sort({ _id: -1 })
      .limit(limit);
    return docs.map((doc) => this.toDomain(doc));
  }

  async deleteById(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await this.tweetModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  async addLikes(id: string, delta: number): Promise<Tweet | null> {
    if (!isValidObjectId(id)) return null;
    // Sem trava de "nunca negativo": cada curtida criada soma 1 e cada curtida
    // removida desconta 1, então o total sempre fecha, mesmo quando o -1 chega
    // antes do +1 (duplo clique). Uma trava aqui descartaria esse -1 e deixaria
    // o contador errado para sempre.
    const doc = await this.tweetModel.findOneAndUpdate(
      { _id: id },
      { $inc: { likesCount: delta } },
      { new: true },
    );
    return doc && this.toDomain(doc);
  }

  private toDomain(doc: TweetDocument): Tweet {
    return {
      id: doc._id.toString(),
      content: doc.content,
      authorId: doc.authorId.toString(),
      parentId: doc.parentId?.toString() ?? null,
      // Entre um -1 e um +1 que chegaram fora de ordem, o valor gravado pode
      // ficar em -1 por um instante; quem lê nunca vê negativo.
      likesCount: Math.max(0, doc.likesCount),
      createdAt: doc.createdAt,
    };
  }
}
