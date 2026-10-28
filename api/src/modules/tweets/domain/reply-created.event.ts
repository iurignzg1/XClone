// Evento anunciado quando alguém responde um pio.
export const REPLY_CREATED = 'tweet.reply-created';

export interface ReplyCreatedEvent {
  replyId: string;
  authorId: string;
  parentAuthorId: string;
}
