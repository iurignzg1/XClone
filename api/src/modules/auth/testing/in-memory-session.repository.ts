import type { NewSession, Session } from '../domain/session.entity.js';
import { SessionRepository } from '../domain/session.repository.js';

// Repositório de sessões em memória, só para os testes (não vai para o build).

export class InMemorySessionRepository extends SessionRepository {
  sessions: Session[] = [];

  create(data: NewSession): Promise<Session> {
    const session: Session = {
      ...data,
      id: `session-${this.sessions.length + 1}`,
      revokedAt: null,
    };
    this.sessions.push(session);
    return Promise.resolve(session);
  }
  findByTokenHash(tokenHash: string) {
    return Promise.resolve(
      this.sessions.find((s) => s.tokenHash === tokenHash) ?? null,
    );
  }
  revoke(id: string) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session || session.revokedAt) return Promise.resolve(false);
    session.revokedAt = new Date();
    return Promise.resolve(true);
  }
  revokeAllByUser(userId: string) {
    for (const s of this.sessions) {
      if (s.userId === userId && !s.revokedAt) s.revokedAt = new Date();
    }
    return Promise.resolve();
  }
}
