import { Injectable, NotFoundException } from '@nestjs/common';
import type { Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';

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
}
