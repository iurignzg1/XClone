import type { NewTweet, Tweet } from './tweet.entity.js';

export abstract class TweetRepository {
  abstract create(data: NewTweet): Promise<Tweet>;
  abstract findById(id: string): Promise<Tweet | null>;
}
