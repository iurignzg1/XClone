export abstract class FollowRepository {
  // Devolve true se o vínculo foi criado agora, false se já existia.
  abstract add(followerId: string, followingId: string): Promise<boolean>;
  // Ids dos usuários que `followerId` segue.
  abstract findFollowingIds(followerId: string): Promise<string[]>;
  // Devolve true se o vínculo foi removido agora, false se não existia.
  abstract remove(followerId: string, followingId: string): Promise<boolean>;
}
