import type { MongoMemoryServer } from 'mongodb-memory-server';
import {
  deleteTweet,
  follow,
  publish,
  toggleLike,
  unfollow,
} from './support/actions.js';
import { createTestApp, startMongo, type TestApp } from './support/test-app.js';
import { signup, type TestSession } from './support/users.js';

interface NotificationRow {
  type: string;
  actorsCount: number;
  read: boolean;
  actors: { username: string }[];
  tweet: { content: string } | null;
}

const NOTIFICATIONS = `
  query {
    notifications {
      type actorsCount read
      actors { username }
      tweet { content }
    }
    unreadNotificationsCount
  }
`;

describe('Notificações (e2e)', () => {
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

  async function inbox(who: TestSession) {
    const { body } = await t.gql<{
      notifications: NotificationRow[];
      unreadNotificationsCount: number;
    }>(NOTIFICATIONS, {}, who.accessToken);
    return body.data!;
  }

  it('várias curtidas no mesmo pio viram uma linha, com quem curtiu por último primeiro', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const caio = await signup(t, 'caio');
    const tweetId = await publish(t, ana, 'meu pio');

    await toggleLike(t, bia, tweetId);
    await toggleLike(t, caio, tweetId);

    expect(await inbox(ana)).toEqual({
      notifications: [
        {
          type: 'LIKE',
          actorsCount: 2,
          read: false,
          actors: [
            { username: caio.user.username },
            { username: bia.user.username },
          ],
          tweet: { content: 'meu pio' },
        },
      ],
      unreadNotificationsCount: 1,
    });
  });

  it('resposta e novo seguidor aparecem, do mais recente ao mais antigo', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'meu pio');

    await publish(t, bia, 'boa!', tweetId);
    await follow(t, bia, ana);

    const { notifications } = await inbox(ana);
    expect(notifications).toMatchObject([
      { type: 'FOLLOW', actorsCount: 1, tweet: null },
      { type: 'REPLY', actorsCount: 1, tweet: { content: 'boa!' } },
    ]);
  });

  it('curtir ou responder o próprio pio não gera notificação', async () => {
    const ana = await signup(t, 'ana');
    const tweetId = await publish(t, ana, 'meu pio');

    await toggleLike(t, ana, tweetId);
    await publish(t, ana, 'respondendo a mim mesma', tweetId);

    expect(await inbox(ana)).toEqual({
      notifications: [],
      unreadNotificationsCount: 0,
    });
  });

  it('desfazer apaga o aviso: curtir e seguir várias vezes, desfazendo, não acumula', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'meu pio');

    for (let i = 0; i < 3; i += 1) {
      await toggleLike(t, bia, tweetId);
      await toggleLike(t, bia, tweetId);
      await follow(t, bia, ana);
      await unfollow(t, bia, ana);
    }
    const afterUndo = await inbox(ana);
    await toggleLike(t, bia, tweetId);
    await follow(t, bia, ana);
    const afterOnce = await inbox(ana);

    // Deixar de seguir não avisa ninguém: só some o "começou a seguir".
    expect(afterUndo.notifications).toEqual([]);
    expect(afterOnce.notifications.map((n) => n.type)).toEqual([
      'FOLLOW',
      'LIKE',
    ]);
  });

  it('marcar como lidas zera o contador; uma curtida nova acende de novo', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const caio = await signup(t, 'caio');
    const tweetId = await publish(t, ana, 'meu pio');
    await toggleLike(t, bia, tweetId);

    await t.gql('mutation { markNotificationsRead }', {}, ana.accessToken);
    const read = await inbox(ana);
    await toggleLike(t, caio, tweetId);
    const again = await inbox(ana);

    expect(read.unreadNotificationsCount).toBe(0);
    expect(read.notifications[0].read).toBe(true);
    expect(again.unreadNotificationsCount).toBe(1);
    expect(again.notifications[0]).toMatchObject({
      actorsCount: 2,
      read: false,
    });
  });

  it('pio apagado leva junto as notificações dele', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    const tweetId = await publish(t, ana, 'meu pio');
    await toggleLike(t, bia, tweetId);

    await deleteTweet(t, ana, tweetId);

    expect((await inbox(ana)).notifications).toEqual([]);
  });

  it('cada pessoa só vê as próprias notificações', async () => {
    const ana = await signup(t, 'ana');
    const bia = await signup(t, 'bia');
    await follow(t, bia, ana);

    expect((await inbox(ana)).notifications).toHaveLength(1);
    expect((await inbox(bia)).notifications).toEqual([]);
  });
});
