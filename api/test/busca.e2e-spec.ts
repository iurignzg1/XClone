import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, startMongo, type TestApp } from './support/test-app.js';
import { signup, type TestSession } from './support/users.js';

// A busca é uma expressão regular montada no repositório do Mongo: só dá para
// testá-la de verdade contra o banco.

describe('Busca de pessoas (e2e)', () => {
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

  async function search(who: TestSession, query: string) {
    const { body } = await t.gql<{ searchUsers: { username: string }[] }>(
      `query ($query: String!) { searchUsers(query: $query) { username } }`,
      { query },
      who.accessToken,
    );
    return body.data!.searchUsers.map((user) => user.username);
  }

  it('acha pelo começo do @ ou por parte do nome, sem diferenciar maiúsculas, e deixa contas suspensas de fora', async () => {
    const mariana = await signup(t, 'mariana');
    // "mar" no meio do nome conta; no meio do @, não.
    const bruno = await signup(t, 'bruno', 'Bruno Marques');
    const amaro = await signup(t, 'amaro', 'Zé');
    const marta = await signup(t, 'marta');
    await t.db
      .collection('users')
      .updateOne(
        { username: marta.user.username },
        { $set: { suspended: true } },
      );

    const found = await search(amaro, 'MAR');

    // Em ordem de @.
    expect(found).toEqual([bruno.user.username, mariana.user.username]);
  });

  it('o termo é tratado como texto, não como expressão regular', async () => {
    const ana = await signup(t, 'ana');

    // Sem o escape, ".*" acharia todo mundo.
    expect(await search(ana, '.*')).toEqual([]);
  });
});
