export const TWEET_MAX_LENGTH = 280;

export interface Tweet {
  id: string;
  content: string;
  authorId: string;
  // Preenchido quando o tweet é uma resposta a outro tweet.
  parentId: string | null;
  likesCount: number;
  createdAt: Date;
}

export interface NewTweet {
  content: string;
  authorId: string;
  parentId?: string;
}
