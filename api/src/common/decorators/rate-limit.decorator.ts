import { Throttle } from '@nestjs/throttler';

export const RATE_LIMIT_WINDOW_MS = 60_000;

// Limite padrão: vale para toda operação que não tem @RateLimit.
export const DEFAULT_RATE_LIMIT = 100;

// Troca o limite padrão de uma operação: no máximo `limit` chamadas por
// minuto, por IP. Ex.: @RateLimit(5) no login.
export const RateLimit = (limit: number) =>
  Throttle({ default: { limit, ttl: RATE_LIMIT_WINDOW_MS } });
