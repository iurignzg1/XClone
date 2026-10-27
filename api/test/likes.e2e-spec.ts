import type { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import {
  codeOf,
  createTestApp,
  startMongo,
  type TestApp,
} from './support/test-app.js';
import { signup, type TestSession } from './support/users.js';

const CREATE_TWEET = `
  mutation ($input: CreateTweetInput!) { createTweet(input: $input) { id } }
`;
const TOGGLE_LIKE = `
  mutation ($input: ToggleLikeInput!) {
    toggleLike(input: $input) { liked likesCount }
  }
`;
const TWEET = `
  query ($id: ID!) { tweet(id: $id) { likesCount likedByMe } }
`;
const TWEET_LIKES = `
  query ($tweetId: ID!) { tweetLikes(tweetId: $tweetId) { username } }
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

  async function publish(
    author: TestSession,
    content = 'um pio',
  ): Promise<string> {
    const { body } = await t.gql<{ createTweet: { id: string } }>(
      CREATE_TWEET,
      { input: { content } },
      author.accessToken,
    );
    return body.data!.createTweet.id;
  }

  function toggle(session: TestSession, tweetId: string) {
    return t.gql<{ toggleLike: { liked: boolean; likesCount: number } }>(
      TOGGLE_LIKE,
      { input: { tweetId } },
      session.accessToken,
    );
  }

  it('curtir e descurtir: o mesmo botão liga e desliga, e o contador acompanha', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(ana);

    const like = await toggle(bia, tweetId);
    const unlike = await toggle(bia, tweetId);

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
    const tweetId = await publish(ana);

    await toggle(bia, tweetId);
    await toggle(caio, tweetId);
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
    const tweetId = await publish(ana);
    await toggle(bia, tweetId);

    const { body } = await t.gql(TWEET_LIKES, { tweetId }, ana.accessToken);

    expect(body.data).toEqual({
      tweetLikes: [{ username: bia.user.username }],
    });
  });

  it('curtidas simultâneas da mesma pessoa não contam em dobro', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(ana);

    // Dois cliques que chegam juntos: o índice único (pessoa + pio) no banco
    // garante uma curtida só, seja qual for a ordem.
    await Promise.all([toggle(bia, tweetId), toggle(bia, tweetId)]);
    const { body } = await t.gql<{
      tweet: { likesCount: number; likedByMe: boolean };
    }>(TWEET, { id: tweetId }, bia.accessToken);
    const likes = await t.db
      .collection('likes')
      .countDocuments({ tweetId: new Types.ObjectId(tweetId) });

    expect(body.data!.tweet.likesCount).toBe(
      body.data!.tweet.likedByMe ? 1 : 0,
    );
    expect(likes).toBe(body.data!.tweet.likesCount);
  });

  it('curtir um pio que não existe dá NOT_FOUND', async () => {
    const ana = await signup(t, 'ana');

    const { body } = await toggle(ana, '000000000000000000000000');

    expect(codeOf(body)).toBe('NOT_FOUND');
  });

  it('sem login não dá para curtir (UNAUTHENTICATED)', async () => {
    const ana = await signup(t, 'ana');
    const tweetId = await publish(ana);

    const { body } = await t.gql(TOGGLE_LIKE, { input: { tweetId } });

    expect(codeOf(body)).toBe('UNAUTHENTICATED');
  });

  it('apagar o pio apaga as curtidas dele', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(ana);
    await toggle(bia, tweetId);

    await t.gql(
      `mutation ($input: DeleteTweetInput!) { deleteTweet(input: $input) }`,
      { input: { tweetId } },
      ana.accessToken,
    );
    const likes = await t.db
      .collection('likes')
      .countDocuments({ tweetId: new Types.ObjectId(tweetId) });

    expect(likes).toBe(0);
  });
});
