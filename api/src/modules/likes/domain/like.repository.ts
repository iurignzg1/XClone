export abstract class LikeRepository {
  // Devolve true se a curtida foi criada agora, false se já existia.
  abstract add(userId: string, tweetId: string): Promise<boolean>;
  // Devolve true se a curtida foi removida agora, false se não existia.
  abstract remove(userId: string, tweetId: string): Promise<boolean>;
  // Apaga todas as curtidas de um tweet (usado quando o tweet é apagado).
  abstract removeAllForTweet(tweetId: string): Promise<void>;
  // Ids de quem curtiu o tweet, da curtida mais recente para a mais antiga.
  abstract findLikerIds(tweetId: string, limit: number): Promise<string[]>;
  // Entre os tweets informados, quais o usuário curtiu (uma consulta só).
  abstract findLikedTweetIds(
    userId: string,
    tweetIds: string[],
  ): Promise<string[]>;
}
