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

  private toDomain(doc: TweetDocument): Tweet {
    return {
      id: doc._id.toString(),
      content: doc.content,
      authorId: doc.authorId.toString(),
      parentId: doc.parentId?.toString() ?? null,
      likesCount: doc.likesCount,
      createdAt: doc.createdAt,
    };
  }
}
