import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { apolloClient } from '../../apollo/client';
import { LogoutAllDocument, LogoutDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from './auth.store';

// Devolve a função de sair e se alguma das duas mutations está em andamento.
export function useLogout() {
  const [logout, logoutState] = useMutation(LogoutDocument);
  const [logoutAll, logoutAllState] = useMutation(LogoutAllDocument);
  const navigate = useNavigate();

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
    // Sem sessão, a rota protegida manda para o login guardando a página atual,
    // para quem teve a sessão expirada voltar a ela depois de entrar. Quem saiu
    // de propósito não quer voltar: o login sem origem leva para a home.
    await navigate('/login', { replace: true });
  }

  return { endSession, loading: logoutState.loading || logoutAllState.loading };
}
