export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string;
  // Quando o login aconteceu. É copiado a cada renovação, para o teto da
  // sessão contar desde o login, e não desde a última renovação.
  loginAt: Date;
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string;
  loginAt: Date;
}
