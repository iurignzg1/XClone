import type { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { deleteTweet, publish, toggleLike } from './support/actions.js';
import {
  codeOf,
  createTestApp,
  startMongo,
  type TestApp,
} from './support/test-app.js';
import { signup } from './support/users.js';

const TWEET = `
  query ($id: ID!) { tweet(id: $id) { likesCount likedByMe } }
`;

describe('Curtidas (e2e)', () => {
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

  const likesOf = (tweetId: string) =>
    t.db
      .collection('likes')
      .countDocuments({ tweetId: new Types.ObjectId(tweetId) });

  it('curtir e descurtir: o mesmo botão liga e desliga, e o contador acompanha', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'um pio');

    const like = await toggleLike(t, bia, tweetId);
    const unlike = await toggleLike(t, bia, tweetId);

    expect(like.body.data).toEqual({
      toggleLike: { liked: true, likesCount: 1 },
    });
    expect(unlike.body.data).toEqual({
      toggleLike: { liked: false, likesCount: 0 },
    });
  });

  it('cada pessoa conta uma vez; likedByMe depende de quem pergunta', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const caio = await signup(t, 'caio');
    const tweetId = await publish(t, ana, 'um pio');

    await toggleLike(t, bia, tweetId);
    await toggleLike(t, caio, tweetId);
    const forBia = await t.gql(TWEET, { id: tweetId }, bia.accessToken);
    const forAna = await t.gql(TWEET, { id: tweetId }, ana.accessToken);

    expect(forBia.body.data).toEqual({
      tweet: { likesCount: 2, likedByMe: true },
    });
    expect(forAna.body.data).toEqual({
      tweet: { likesCount: 2, likedByMe: false },
    });
  });

  it('tweetLikes lista quem curtiu', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'um pio');
    await toggleLike(t, bia, tweetId);

    const { body } = await t.gql(
      `query ($tweetId: ID!) { tweetLikes(tweetId: $tweetId) { username } }`,
      { tweetId },
      ana.accessToken,
    );

    expect(body.data).toEqual({
      tweetLikes: [{ username: bia.user.username }],
    });
  });

  it('curtidas simultâneas da mesma pessoa não contam em dobro', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'um pio');

    // Dois cliques que chegam juntos: o índice único (pessoa + pio) no banco
    // garante uma curtida só, seja qual for a ordem.
    await Promise.all([
      toggleLike(t, bia, tweetId),
      toggleLike(t, bia, tweetId),
    ]);
    const { body } = await t.gql<{
      tweet: { likesCount: number; likedByMe: boolean };
    }>(TWEET, { id: tweetId }, bia.accessToken);

    expect(body.data!.tweet.likesCount).toBe(
      body.data!.tweet.likedByMe ? 1 : 0,
    );
    expect(await likesOf(tweetId)).toBe(body.data!.tweet.likesCount);
  });

  it('curtir um pio que não existe dá NOT_FOUND', async () => {
    const ana = await signup(t, 'ana');

    const { body } = await toggleLike(t, ana, '000000000000000000000000');

    expect(codeOf(body)).toBe('NOT_FOUND');
  });

  it('apagar o pio apaga as curtidas dele', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'um pio');
    await toggleLike(t, bia, tweetId);

    await deleteTweet(t, ana, tweetId);

    expect(await likesOf(tweetId)).toBe(0);
  });
});
