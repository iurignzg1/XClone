import type { MongoMemoryServer } from 'mongodb-memory-server';
import { follow, publish } from './support/actions.js';
import { createTestApp, startMongo, type TestApp } from './support/test-app.js';
import { signup, type TestSession } from './support/users.js';

// O feed e as listas de respostas dependem das consultas no Mongo (quem
// entra, a ordem, o cursor). Por isso são testados aqui, com o banco real.

describe('Feed e respostas (e2e)', () => {
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

  async function feedOf(who: TestSession, limit = 20, after?: string) {
    const { body } = await t.gql<{ feed: { id: string; content: string }[] }>(
      `query ($limit: Int!, $after: ID) {
        feed(limit: $limit, after: $after) { id content }
      }`,
      { limit, after },
      who.accessToken,
    );
    return body.data!.feed;
  }

  const contents = (tweets: { content: string }[]) =>
    tweets.map((tweet) => tweet.content);

  it('o feed tem os meus pios e os de quem eu sigo, sem as respostas; seguir alguém muda o feed', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const caio = await signup(t, 'caio');
    await publish(t, bia, 'pio da bia');
    await publish(t, caio, 'pio do caio');
    const anaTweet = await publish(t, ana, 'pio da ana');
    await publish(t, bia, 'resposta da bia', anaTweet);

    const before = await feedOf(ana);
    await follow(t, ana, bia);
    // Seguir de novo não dá erro nem duplica nada.
    const again = await follow(t, ana, bia);
    const after = await feedOf(ana);

    expect(contents(before)).toEqual(['pio da ana']);
    expect(again.body.errors).toBeUndefined();
    expect(contents(after)).toEqual(['pio da ana', 'pio da bia']);
  });

  it('o feed pagina pelo cursor, sem repetir nem pular pios', async () => {
    const ana = await signup(t, 'ana');
    for (let i = 1; i <= 5; i += 1) await publish(t, ana, `pio ${i}`);

    const first = await feedOf(ana, 2);
    const second = await feedOf(ana, 2, first.at(-1)!.id);
    const third = await feedOf(ana, 2, second.at(-1)!.id);

    expect([first, second, third].map(contents)).toEqual([
      ['pio 5', 'pio 4'],
      ['pio 3', 'pio 2'],
      ['pio 1'],
    ]);
  });

  it('as respostas aparecem no pio respondido e na aba "Respostas" de quem respondeu', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const caio = await signup(t, 'caio');
    const anaTweet = await publish(t, ana, 'pio da ana');
    const caioTweet = await publish(t, caio, 'pio do caio');
    // As respostas do pio saem pela data de criação, que tem precisão de
    // milissegundo: a pausa garante datas diferentes.
    const pause = () => new Promise((resolve) => setTimeout(resolve, 5));
    await publish(t, bia, 'primeira', anaTweet);
    await pause();
    await publish(t, caio, 'segunda', anaTweet);
    await pause();
    await publish(t, bia, 'terceira', caioTweet);

    const detail = await t.gql<{ tweet: { replies: { content: string }[] } }>(
      `query ($id: ID!) { tweet(id: $id) { replies { content } } }`,
      { id: anaTweet },
      ana.accessToken,
    );
    const tab = await t.gql<{ userReplies: { content: string }[] }>(
      `query ($username: String!) { userReplies(username: $username) { content } }`,
      { username: bia.user.username },
      ana.accessToken,
    );

    // No pio, a conversa em ordem (mais antiga primeiro); na aba, o que a
    // pessoa respondeu por último vem primeiro.
    expect(contents(detail.body.data!.tweet.replies)).toEqual([
      'primeira',
      'segunda',
    ]);
    expect(contents(tab.body.data!.userReplies)).toEqual([
      'terceira',
      'primeira',
    ]);
  });
});
