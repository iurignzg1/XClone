import { apolloClient } from '../../apollo/client';
import { useAuthStore, type Session } from './auth.store';

// Troca de sessão: limpa o cache do Apollo antes, para não sobrar dado do
// usuário anterior (ex.: se a sessão anterior expirou sem logout).
export async function startSession(session: Session) {
  await apolloClient.clearStore();
  useAuthStore.getState().setSession(session);
}
