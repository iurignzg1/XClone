import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
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

  async findByAuthors(authorIds: string[], limit: number): Promise<Tweet[]> {
    // parentId: null filtra só tweets "de topo": respostas ficam no detalhe.
    const docs = await this.tweetModel
      .find({ authorId: { $in: authorIds }, parentId: null })
      .sort({ createdAt: -1 })
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
