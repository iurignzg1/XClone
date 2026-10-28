import { CombinedGraphQLErrors } from '@apollo/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../features/auth/auth.store';
import { FeedDocument, LoginDocument } from '../gql/graphql';
import { apolloClient } from './client';

// Troca o fetch por uma API de mentira que:
// - recusa o Feed (UNAUTHENTICATED) enquanto o token for o velho;
// - devolve o par novo no RefreshSession;
// - guarda a ordem das operações recebidas.
let calls: string[];
let refreshBehavior: 'ok' | 'recusado' | 'limite' | 'rede';

const gqlError = (message: string, code: string) => ({
  errors: [{ message, extensions: { code } }],
  data: null,
});

const session = (access: string, refresh: string) => ({
  data: {
    refreshSession: {
      __typename: 'AuthPayload',
      accessToken: access,
      refreshToken: refresh,
      user: {
        __typename: 'Me',
        id: 'u1',
        username: 'ana',
        displayName: 'Ana',
        email: 'ana@x.com',
        role: 'USER',
      },
    },
  },
});

function fakeApi(_url: unknown, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body)) as { operationName: string };
  const headers = new Headers(init?.headers);
  calls.push(body.operationName);

  let payload: unknown;
  if (body.operationName === 'RefreshSession') {
    if (refreshBehavior === 'rede') return Promise.reject(new TypeError('Failed to fetch'));
    payload =
      refreshBehavior === 'ok'
        ? session('token-novo', 'refresh-novo')
        : refreshBehavior === 'limite'
          ? gqlError('Muitas tentativas', 'TOO_MANY_REQUESTS')
          : gqlError('Sessão inválida', 'UNAUTHENTICATED');
  } else if (body.operationName === 'Login') {
    payload = gqlError('Credenciais inválidas', 'UNAUTHENTICATED');
  } else {
    payload =
      headers.get('authorization') === 'Bearer token-novo' ||
      headers.get('authorization') === 'Bearer token-bom'
        ? { data: { feed: [] } }
        : gqlError('Unauthorized', 'UNAUTHENTICATED');
  }
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

const feed = (limit: number) =>
  apolloClient.query({ query: FeedDocument, variables: { limit }, fetchPolicy: 'network-only' });

beforeEach(() => {
  calls = [];
  refreshBehavior = 'ok';
  vi.stubGlobal('fetch', vi.fn(fakeApi));
  useAuthStore.setState({ user: null, accessToken: 'token-velho', refreshToken: 'refresh-velho' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  localStorage.clear();
});

describe('cliente Apollo: token e renovação', () => {
  it('manda o access token no header Authorization', async () => {
    useAuthStore.setState({ accessToken: 'token-bom' });

    const { data } = await feed(1);

    expect(data?.feed).toEqual([]);
    expect(calls).toEqual(['Feed']);
  });

  it('com o token vencido, renova a sessão e repete a operação sozinho', async () => {
    const { data } = await feed(1);

    expect(data?.feed).toEqual([]);
    expect(calls).toEqual(['Feed', 'RefreshSession', 'Feed']);
    expect(useAuthStore.getState().accessToken).toBe('token-novo');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-novo');
  });

  it('várias requisições falhando juntas fazem uma renovação só', async () => {
    const results = await Promise.allSettled([feed(1), feed(2), feed(3), feed(4)]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    // Duas renovações com o mesmo refresh token fariam o back derrubar a sessão.
    expect(calls.filter((c) => c === 'RefreshSession')).toHaveLength(1);
    expect(calls.filter((c) => c === 'Feed')).toHaveLength(8);
  });

  it('senha errada no login não tenta renovar a sessão', async () => {
    const error = await apolloClient
      .mutate({
        mutation: LoginDocument,
        variables: { input: { email: 'ana@x.com', password: 'errada-errada' } },
      })
      .catch((e: unknown) => e);

    expect(CombinedGraphQLErrors.is(error)).toBe(true);
    expect(calls).toEqual(['Login']);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-velho');
  });

  it('se o back recusa o refresh token, devolve o erro e encerra a sessão', async () => {
    refreshBehavior = 'recusado';

    const error = await feed(1).catch((e: unknown) => e);

    expect(CombinedGraphQLErrors.is(error)).toBe(true);
    expect(calls).toEqual(['Feed', 'RefreshSession']);
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('renovação barrada pelo rate limit não encerra a sessão (o token ainda vale)', async () => {
    refreshBehavior = 'limite';

    await expect(feed(1)).rejects.toBeDefined();

    expect(calls).toEqual(['Feed', 'RefreshSession']);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-velho');
  });

  it('erro de rede na renovação não encerra a sessão', async () => {
    refreshBehavior = 'rede';

    await expect(feed(1)).rejects.toBeDefined();

    expect(useAuthStore.getState().refreshToken).toBe('refresh-velho');
  });

  it('sem refresh token, não há o que renovar e o erro volta direto', async () => {
    useAuthStore.setState({ refreshToken: null });

    const error = await feed(1).catch((e: unknown) => e);

    expect(CombinedGraphQLErrors.is(error)).toBe(true);
    expect(calls).toEqual(['Feed']);
  });
});
