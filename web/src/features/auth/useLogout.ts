import { useMutation } from '@apollo/client/react';
import { apolloClient } from '../../apollo/client';
import { LogoutAllDocument, LogoutDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from './auth.store';

// Devolve a função de sair e se alguma das duas mutations está em andamento.
export function useLogout() {
  const [logout, logoutState] = useMutation(LogoutDocument);
  const [logoutAll, logoutAllState] = useMutation(LogoutAllDocument);

  async function endSession(everywhere: boolean) {
    const { refreshToken } = useAuthStore.getState();
    // Mesmo que a API não responda, o usuário quer sair: a sessão local sempre cai.
    await attempt(() =>
      everywhere
        ? logoutAll()
        : logout({ variables: { input: { refreshToken: refreshToken ?? '' } } }),
    );
    useAuthStore.getState().clearSession();
    await apolloClient.clearStore();
  }

  return { endSession, loading: logoutState.loading || logoutAllState.loading };
}
