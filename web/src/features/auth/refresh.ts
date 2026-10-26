import { ApolloClient, CombinedGraphQLErrors, HttpLink, InMemoryCache } from '@apollo/client';
import { API_URL } from '../../config';
import { RefreshSessionDocument } from '../../gql/graphql';
import { useAuthStore } from './auth.store';

// Cliente à parte, sem o errorLink: se o refresh também desse UNAUTHENTICATED e
// passasse pelo errorLink, ele tentaria renovar a renovação, num ciclo.
const refreshClient = new ApolloClient({
  link: new HttpLink({ uri: API_URL }),
  cache: new InMemoryCache(),
});

let inFlight: Promise<string | null> | null = null;

// Renova o par de tokens. Se várias requisições falharem juntas, todas esperam
// a MESMA renovação: duas renovações com o mesmo refresh token fariam o back
// tratar a segunda como reuso e derrubar todas as sessões.
// Devolve o access token novo, ou null se não há sessão para renovar.
export function refreshAccessToken(): Promise<string | null> {
  inFlight ??= renew().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function renew(): Promise<string | null> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await refreshClient.mutate({
      mutation: RefreshSessionDocument,
      variables: { input: { refreshToken } },
    });
    if (!data) return null;
    setSession(data.refreshSession);
    return data.refreshSession.accessToken;
  } catch (error) {
    // O back recusou o refresh token (vencido, revogado ou reusado): a sessão
    // acabou. Já um erro de rede (API fora do ar) não encerra a sessão.
    if (CombinedGraphQLErrors.is(error)) clearSession();
    return null;
  }
}
