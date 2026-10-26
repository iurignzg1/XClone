import {
  ApolloClient,
  ApolloLink,
  CombinedGraphQLErrors,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { from, mergeMap, throwError } from 'rxjs';
import { API_URL } from '../config';
import { useAuthStore } from '../features/auth/auth.store';
import { refreshAccessToken } from '../features/auth/refresh';

// Operações em que UNAUTHENTICATED é a resposta esperada (senha errada, token
// inválido): renovar a sessão não adianta e só atrapalharia.
const NO_REFRESH = new Set(['Login', 'Signup', 'RefreshSession', 'Logout']);

// authLink: coloca o access token em todas as requisições.
const authLink = new SetContextLink((previous) => {
  const token = useAuthStore.getState().accessToken;
  return {
    headers: { ...previous.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  };
});

// errorLink: access token vencido (UNAUTHENTICATED) → renova a sessão uma vez
// e repete a operação, sem o usuário perceber.
const errorLink = new ErrorLink(({ error, operation, forward }) => {
  const unauthenticated =
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
  const alreadyRetried = operation.getContext().retried === true;
  if (!unauthenticated || alreadyRetried || NO_REFRESH.has(operation.operationName ?? '')) {
    return;
  }
  return from(refreshAccessToken()).pipe(
    mergeMap((token) => {
      if (!token) return throwError(() => error);
      operation.setContext({ retried: true });
      return forward(operation);
    }),
  );
});

// A ordem importa: o errorLink fica antes do authLink para, ao repetir a
// operação, o authLink rodar de novo e já mandar o token renovado.
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, new HttpLink({ uri: API_URL })]),
  cache: new InMemoryCache(),
});
