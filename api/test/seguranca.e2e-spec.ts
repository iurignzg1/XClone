import type { MongoMemoryServer } from 'mongodb-memory-server';
import {
  codeOf,
  createTestApp,
  startMongo,
  type TestApp,
} from './support/test-app.js';
import { signup } from './support/users.js';

describe('Proteções da API (e2e)', () => {
  let mongo: MongoMemoryServer;
  let t: TestApp;

  beforeAll(async () => {
    mongo = await startMongo();
  }, 120_000);
  beforeEach(async () => {
    t = await createTestApp(mongo.getUri());
  });
  afterEach(() => t.close());
  afterAll(() => mongo.stop());

  it('o helmet põe os cabeçalhos de segurança nas respostas', async () => {
    const { headers } = await t.gql('{ __typename }');

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('a consulta que o front faz na página do pio passa no limite de complexidade', async () => {
    const ana = await signup(t, 'ana');

    const { body } = await t.gql(
      `query ($id: ID!) {
        tweet(id: $id) {
          id content likesCount likedByMe repliesCount
          author { id username displayName }
          replies { id content likesCount likedByMe repliesCount author { id username displayName } }
        }
      }`,
      { id: '000000000000000000000000' },
      ana.accessToken,
    );

    // Passou do limite e chegou ao resolver, que não achou o pio.
    expect(codeOf(body)).toBe('NOT_FOUND');
  });

  it('recusa uma consulta cara demais antes de tocar no banco (QUERY_TOO_COMPLEX)', async () => {
    const ana = await signup(t, 'ana');

    // Respostas das respostas: até 50 × 50 pios numa consulta só.
    const { status, body } = await t.gql(
      `query { feed { replies { replies { id content } } } }`,
      {},
      ana.accessToken,
    );

    expect(status).toBe(400);
    expect(codeOf(body)).toBe('QUERY_TOO_COMPLEX');
    expect(body.data).toBeUndefined();
  });

  it('variável inválida continua dando erro de input, e não erro interno', async () => {
    const ana = await signup(t, 'ana');

    const { body } = await t.gql(
      `query ($limit: Int) { feed(limit: $limit) { id } }`,
      { limit: 'muitos' },
      ana.accessToken,
    );

    expect(codeOf(body)).toBe('BAD_USER_INPUT');
  });
});
