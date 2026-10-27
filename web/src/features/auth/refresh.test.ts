import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth.store';
import { refreshAccessToken } from './refresh';

// Resposta da API à mutation refreshSession, recusada com um código de erro.
function apiRefuses(code: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: null,
            errors: [{ message: 'recusado', extensions: { code } }],
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    ),
  );
}

function loggedIn() {
  useAuthStore.setState({
    accessToken: 'velho',
    refreshToken: 'refresh-token',
  });
}

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refresh token recusado (UNAUTHENTICATED): encerra a sessão', async () => {
    loggedIn();
    apiRefuses('UNAUTHENTICATED');

    expect(await refreshAccessToken()).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('rate limit (TOO_MANY_REQUESTS): não renova agora, mas mantém a sessão', async () => {
    loggedIn();
    apiRefuses('TOO_MANY_REQUESTS');

    expect(await refreshAccessToken()).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token');
  });
});
