export abstract class FollowRepository {
  // Devolve true se o vínculo foi criado agora, false se já existia.
  abstract add(followerId: string, followingId: string): Promise<boolean>;
  // Ids dos usuários que `followerId` segue.
  abstract findFollowingIds(followerId: string): Promise<string[]>;
  // Listas para mostrar na tela, do vínculo mais recente para o mais antigo:
  // quem segue `userId` e quem `userId` segue.
  abstract listFollowerIds(userId: string, limit: number): Promise<string[]>;
  abstract listFollowingIds(userId: string, limit: number): Promise<string[]>;
  // Entre os usuários informados, quais `followerId` segue (uma consulta só).
  abstract findFollowedIds(
    followerId: string,
    userIds: string[],
  ): Promise<string[]>;
  // Quantos seguidores cada usuário tem: { id do usuário → total }, numa
  // consulta só. Quem não aparece no resultado tem 0.
  abstract countFollowers(userIds: string[]): Promise<Map<string, number>>;
  // Quantas pessoas cada usuário segue, no mesmo formato.
  abstract countFollowing(userIds: string[]): Promise<Map<string, number>>;
  // Os usuários com mais seguidores, deixando de fora os ids informados
  // (quem pede e quem ele já segue). Base das sugestões de quem seguir.
  abstract findMostFollowedIds(
    excludeIds: string[],
    limit: number,
  ): Promise<string[]>;
  // Devolve true se o vínculo foi removido agora, false se não existia.
  abstract remove(followerId: string, followingId: string): Promise<boolean>;
}
