export abstract class LikeRepository {
  // Devolve true se a curtida foi criada agora, false se já existia.
  abstract add(userId: string, tweetId: string): Promise<boolean>;
  // Devolve true se a curtida foi removida agora, false se não existia.
  abstract remove(userId: string, tweetId: string): Promise<boolean>;
}
