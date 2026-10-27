import type { MongoMemoryServer } from 'mongodb-memory-server';
import {
  codeOf,
  createTestApp,
  startMongo,
  type TestApp,
} from './support/test-app.js';

// Arquivo à parte porque o NODE_ENV é lido uma vez, quando a API é importada:
// aqui a API sobe como em produção.
describe('API em produção (e2e)', () => {
  let mongo: MongoMemoryServer;
  let t: TestApp;

  beforeAll(async () => {
    mongo = await startMongo();
    t = await createTestApp(mongo.getUri(), { NODE_ENV: 'production' });
  }, 120_000);
  afterAll(async () => {
    await t?.close();
    await mongo?.stop();
  });

  it('não responde à introspecção (ninguém lê o mapa da API)', async () => {
    const { body } = await t.gql('{ __schema { types { name } } }');

    expect(body.data).toBeUndefined();
    expect(codeOf(body)).toBe('GRAPHQL_VALIDATION_FAILED');
  });

  it('não sugere nomes de campos nos erros ("Did you mean...?")', async () => {
    const { body } = await t.gql('{ fee { id } }');

    expect(body.errors?.[0].message).not.toMatch(/Did you mean/);
  });

  it('não serve o GraphiQL', async () => {
    const { default: request } = await import('supertest');

    const res = await request(t.app.getHttpServer())
      .get('/graphql')
      .set('Accept', 'text/html');

    expect(res.text).not.toMatch(/graphiql/i);
  });
});
