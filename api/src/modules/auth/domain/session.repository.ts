import type { NewSession, Session } from './session.entity.js';

export abstract class SessionRepository {
  abstract create(data: NewSession): Promise<Session>;
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;
  // Atômico: só revoga se a sessão ainda estiver ativa. Devolve false se
  // outra requisição chegou antes (importante na rotação do refresh token).
  abstract revoke(id: string): Promise<boolean>;
  abstract revokeAllByUser(userId: string): Promise<void>;
}
