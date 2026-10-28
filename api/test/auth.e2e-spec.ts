import type { MongoMemoryServer } from 'mongodb-memory-server';
import { makeAdmin, suspend } from './support/actions.js';
import {
  codeOf,
  createTestApp,
  startMongo,
  type TestApp,
} from './support/test-app.js';
import { PASSWORD, signup } from './support/users.js';

const LOGIN = `
  mutation ($input: LoginInput!) {
    login(input: $input) { accessToken refreshToken }
  }
`;
const REFRESH = `
  mutation ($input: RefreshTokenInput!) {
    refreshSession(input: $input) { accessToken refreshToken }
  }
`;
const LOGOUT = `
  mutation ($input: RefreshTokenInput!) { logout(input: $input) }
`;
const ME = `query { me { id username } }`;

describe('Autenticação (e2e)', () => {
  let mongo: MongoMemoryServer;
  let t: TestApp;

  // Um banco por arquivo; uma API nova por teste, para cada teste começar com
  // o rate limit zerado (a contagem fica na memória da API).
  beforeAll(async () => {
    mongo = await startMongo();
  }, 120_000);
  beforeEach(async () => {
    t = await createTestApp(mongo.getUri());
  });
  afterEach(() => t.close());
  afterAll(() => mongo.stop());

  it('o cadastro já entra: o access token abre o `me`, com a capa padrão', async () => {
    const session = await signup(t, 'ana');

    const { body } = await t.gql(
      `query { me { id username cover } }`,
      {},
      session.accessToken,
    );

    expect(body.data).toEqual({
      me: {
        id: session.user.id,
        username: session.user.username,
        cover: 'grafite',
      },
    });
  });

  it('recusa um username já em uso (CONFLICT)', async () => {
    const ana = await signup(t, 'ana');

    const { body } = await t.gql(
      `mutation ($input: SignupInput!) { signup(input: $input) { accessToken } }`,
      {
        input: {
          username: ana.user.username,
          email: 'outro@teste.com',
          password: PASSWORD,
          displayName: 'Outra Ana',
        },
      },
    );

    expect(codeOf(body)).toBe('CONFLICT');
    expect(body.errors?.[0].message).toBe('Nome de usuário já em uso');
  });

  it('recusa input inválido antes de chegar ao service (BAD_USER_INPUT)', async () => {
    const { body } = await t.gql(LOGIN, {
      input: { email: 'não é e-mail', password: PASSWORD },
    });

    expect(codeOf(body)).toBe('BAD_USER_INPUT');
  });

  it('login certo devolve tokens; senha errada e e-mail inexistente dão o mesmo erro', async () => {
    const ana = await signup(t, 'ana');

    const ok = await t.gql(LOGIN, {
      input: { email: ana.user.email, password: PASSWORD },
    });
    const wrongPassword = await t.gql(LOGIN, {
      input: { email: ana.user.email, password: 'senha-errada' },
    });
    const unknownEmail = await t.gql(LOGIN, {
      input: { email: 'ninguem@teste.com', password: PASSWORD },
    });

    expect(ok.body.data).toMatchObject({
      login: { accessToken: /^ey/, refreshToken: /.+/ },
    });
    // Mesma mensagem nos dois casos: não dá para descobrir quais e-mails
    // existem tentando logar.
    expect(wrongPassword.body.errors?.[0]).toMatchObject({
      message: 'Credenciais inválidas',
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect(unknownEmail.body.errors?.[0]).toMatchObject({
      message: 'Credenciais inválidas',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('operação protegida sem token, ou com token inventado, dá UNAUTHENTICATED', async () => {
    const semToken = await t.gql(ME);
    const inventado = await t.gql(ME, {}, 'nao.e.um.jwt');

    expect(codeOf(semToken.body)).toBe('UNAUTHENTICATED');
    expect(codeOf(inventado.body)).toBe('UNAUTHENTICATED');
  });

  it('refreshSession troca o par de tokens; o par novo funciona', async () => {
    const ana = await signup(t, 'ana');

    const { body } = await t.gql<{
      refreshSession: { accessToken: string; refreshToken: string };
    }>(REFRESH, { input: { refreshToken: ana.refreshToken } });
    const renewed = body.data!.refreshSession;
    const me = await t.gql(ME, {}, renewed.accessToken);

    expect(renewed.refreshToken).not.toBe(ana.refreshToken);
    expect(me.body.data).toEqual({
      me: { id: ana.user.id, username: ana.user.username },
    });
  });

  it('reusar um refresh token já trocado derruba todas as sessões da conta', async () => {
    const ana = await signup(t, 'ana');
    const first = await t.gql<{
      refreshSession: { refreshToken: string };
    }>(REFRESH, { input: { refreshToken: ana.refreshToken } });
    const newToken = first.body.data!.refreshSession.refreshToken;

    // Alguém (um ladrão, por exemplo) apresenta o token antigo de novo.
    const reuse = await t.gql(REFRESH, {
      input: { refreshToken: ana.refreshToken },
    });
    // Nem o dono, com o token novo, consegue mais renovar: precisa logar.
    const owner = await t.gql(REFRESH, { input: { refreshToken: newToken } });

    expect(codeOf(reuse.body)).toBe('UNAUTHENTICATED');
    expect(codeOf(owner.body)).toBe('UNAUTHENTICATED');
  });

  it('depois do logout, o refresh token não renova mais', async () => {
    const ana = await signup(t, 'ana');

    const logout = await t.gql(LOGOUT, {
      input: { refreshToken: ana.refreshToken },
    });
    const refresh = await t.gql(REFRESH, {
      input: { refreshToken: ana.refreshToken },
    });

    expect(logout.body.data).toEqual({ logout: true });
    expect(codeOf(refresh.body)).toBe('UNAUTHENTICATED');
  });

  it('conta suspensa por um ADMIN não consegue mais entrar (FORBIDDEN)', async () => {
    const admin = await signup(t, 'admin');
    const bia = await signup(t, 'bia');
    await makeAdmin(t, admin);

    const suspended = await suspend(t, admin, bia);
    const login = await t.gql(LOGIN, {
      input: { email: bia.user.email, password: PASSWORD },
    });

    expect(suspended.body.data).toEqual({ suspendUser: { suspended: true } });
    expect(login.body.errors?.[0]).toMatchObject({
      message: 'Conta suspensa',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('usuário comum não pode suspender ninguém (FORBIDDEN)', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');

    const { body } = await suspend(t, ana, bia);

    expect(codeOf(body)).toBe('FORBIDDEN');
  });

  it('rate limit: a 6ª tentativa de login no mesmo minuto dá TOO_MANY_REQUESTS, sem travar as outras operações', async () => {
    const ana = await signup(t, 'ana');
    const attempt = () =>
      t.gql(LOGIN, {
        input: { email: 'alvo@teste.com', password: 'chute-errado' },
      });

    // A 1ª já avisa nos cabeçalhos quanto falta para o limite.
    const first = await attempt();
    expect(first.headers['x-ratelimit-limit']).toBe('5');
    expect(first.headers['x-ratelimit-remaining']).toBe('4');
    // Até a 5ª, passam pelo limite (e falham pela senha).
    for (let i = 2; i <= 5; i += 1) {
      expect(codeOf((await attempt()).body)).toBe('UNAUTHENTICATED');
    }
    const sixth = await attempt();
    // O limite é por operação: o resto da API continua respondendo.
    const me = await t.gql(ME, {}, ana.accessToken);

    expect(sixth.body.errors?.[0]).toMatchObject({
      message: 'Muitas tentativas. Espere um minuto e tente de novo.',
      extensions: { code: 'TOO_MANY_REQUESTS' },
    });
    expect(me.body.data).toEqual({
      me: { id: ana.user.id, username: ana.user.username },
    });
  });
});
