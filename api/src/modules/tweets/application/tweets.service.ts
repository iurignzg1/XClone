import { Injectable, NotFoundException } from '@nestjs/common';
import type { Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';

const REPLIES_LIMIT = 50;

export interface CreateTweetData {
  authorId: string;
  content: string;
  parentId?: string;
}

@Injectable()
export class TweetsService {
  constructor(private readonly tweetRepository: TweetRepository) {}

  async create(data: CreateTweetData): Promise<Tweet> {
    // Uma resposta só faz sentido se o tweet respondido existir.
    if (data.parentId) {
      const parent = await this.tweetRepository.findById(data.parentId);
      if (!parent) {
        throw new NotFoundException('Tweet respondido não encontrado');
      }
    }
    return this.tweetRepository.create(data);
  }

  async findById(id: string): Promise<Tweet> {
    const tweet = await this.tweetRepository.findById(id);
    if (!tweet) {
      throw new NotFoundException('Tweet não encontrado');
    }
    return tweet;
  }

  findReplies(tweetId: string): Promise<Tweet[]> {
    return this.tweetRepository.findReplies(tweetId, REPLIES_LIMIT);
  }

  // A autorização (autor ou moderador) é checada antes, pelo TweetOwnerGuard.
  async delete(tweetId: string): Promise<void> {
    await this.tweetRepository.deleteById(tweetId);
  }

  findByAuthors(authorIds: string[], limit: number): Promise<Tweet[]> {
    return this.tweetRepository.findByAuthors(authorIds, limit);
  }

  addLikes(tweetId: string, delta: number): Promise<Tweet | null> {
    return this.tweetRepository.addLikes(tweetId, delta);
  }
}
