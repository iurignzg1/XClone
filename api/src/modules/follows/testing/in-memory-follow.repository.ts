import { FollowRepository } from '../domain/follow.repository.js';

// Repositório de vínculos em memória, só para os testes (não vai para o build).

export class InMemoryFollowRepository extends FollowRepository {
  follows = new Set<string>();

  add(followerId: string, followingId: string): Promise<boolean> {
    const key = `${followerId}:${followingId}`;
    const isNew = !this.follows.has(key);
    this.follows.add(key);
    return Promise.resolve(isNew);
  }

  findFollowingIds(followerId: string): Promise<string[]> {
    return Promise.resolve(
      [...this.follows]
        .filter((key) => key.startsWith(`${followerId}:`))
        .map((key) => key.split(':')[1]),
    );
  }

  remove(followerId: string, followingId: string): Promise<boolean> {
    return Promise.resolve(this.follows.delete(`${followerId}:${followingId}`));
  }

  findFollowedIds(followerId: string, userIds: string[]): Promise<string[]> {
    this.followedCalls.push(userIds);
    return Promise.resolve(
      userIds.filter((id) => this.follows.has(`${followerId}:${id}`)),
    );
  }

  // Cada chamada fica registrada para os testes contarem as consultas.
  followedCalls: string[][] = [];
  countCalls: string[][] = [];

  countFollowers(userIds: string[]): Promise<Map<string, number>> {
    return this.countBy(1, userIds);
  }

  countFollowing(userIds: string[]): Promise<Map<string, number>> {
    return this.countBy(0, userIds);
  }

  // position 0 = quem segue; 1 = quem é seguido.
  private countBy(position: 0 | 1, userIds: string[]) {
    this.countCalls.push(userIds);
    const totals = new Map<string, number>();
    for (const key of this.follows) {
      const id = key.split(':')[position];
      if (userIds.includes(id)) totals.set(id, (totals.get(id) ?? 0) + 1);
    }
    return Promise.resolve(totals);
  }
}
