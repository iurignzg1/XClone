import type { MongoMemoryServer } from 'mongodb-memory-server';
import {
  clearData,
  follow,
  makeAdmin,
  publish,
  suspend,
  toggleLike,
} from './support/actions.js';
import {
  codeOf,
  createTestApp,
  startMongo,
  type TestApp,
} from './support/test-app.js';
import { signup } from './support/users.js';

// O visitante (sem login) lê a home, os pios e os perfis; qualquer outra coisa
// exige login. Aqui se prova as duas metades: o que ele vê e o que ele não faz.

describe('Visitante (e2e)', () => {
  let mongo: MongoMemoryServer;
  let t: TestApp;

  beforeAll(async () => {
    mongo = await startMongo();
  }, 120_000);
  beforeEach(async () => {
    t = await createTestApp(mongo.getUri());
    // O "mais curtidos" é global: cada teste começa sem os dados dos outros.
    await clearData(t);
  });
  afterEach(() => t.close());
  afterAll(() => mongo.stop());

  const TOP = `query { topTweets { content likesCount likedByMe repliesCount author { username } } }`;

  describe('o que o visitante vê', () => {
    it('a página inicial mostra os pios mais curtidos, sem respostas e sem contas suspensas', async () => {
      const admin = await signup(t, 'admin');
      const ana = await signup(t, 'ana');
      const bia = await signup(t, 'bia');
      const caio = await signup(t, 'caio');
      await makeAdmin(t, admin);
      const calmo = await publish(t, ana, 'pio calmo');
      const famoso = await publish(t, ana, 'pio famoso');
      const medio = await publish(t, bia, 'pio médio');
      const doSuspenso = await publish(t, caio, 'pio de conta suspensa');
      await publish(t, bia, 'resposta famosa', famoso);
      for (const who of [admin, ana, bia]) await toggleLike(t, who, famoso);
      for (const who of [admin, ana]) await toggleLike(t, who, medio);
      for (const who of [admin, ana, bia]) await toggleLike(t, who, doSuspenso);
      await suspend(t, admin, caio);
      expect(calmo).toBeTruthy();

      // Sem token, como o visitante pede.
      const { body } = await t.gql<{
        topTweets: {
          content: string;
          likesCount: number;
          likedByMe: boolean;
          author: { username: string };
        }[];
      }>(TOP);

      expect(body.errors).toBeUndefined();
      // Mais curtido primeiro; o empate (nenhuma curtida) vai do mais novo
      // para o mais antigo; resposta e conta suspensa ficam de fora.
      expect(body.data!.topTweets.map((tweet) => tweet.content)).toEqual([
        'pio famoso',
        'pio médio',
        'pio calmo',
      ]);
      expect(body.data!.topTweets[0]).toMatchObject({
        likesCount: 3,
        likedByMe: false,
        author: { username: ana.user.username },
      });
    });

    it('quem está logado vê likedByMe nos mesmos pios', async () => {
      const ana = await signup(t, 'ana');
      const bia = await signup(t, 'bia');
      const id = await publish(t, ana, 'pio famoso');
      await toggleLike(t, bia, id);

      const { body } = await t.gql<{ topTweets: { likedByMe: boolean }[] }>(
        TOP,
        {},
        bia.accessToken,
      );

      expect(body.data!.topTweets[0].likedByMe).toBe(true);
    });

    it('o pio com as respostas e o perfil com as abas abrem sem login; a conta suspensa some', async () => {
      const admin = await signup(t, 'admin');
      const ana = await signup(t, 'ana');
      const caio = await signup(t, 'caio');
      await makeAdmin(t, admin);
      const id = await publish(t, ana, 'pio da ana');
      await publish(t, ana, 'minha resposta', id);
      const replyOfSuspended = await publish(
        t,
        caio,
        'resposta do suspenso',
        id,
      );
      const caioTweet = await publish(t, caio, 'pio do suspenso');
      await suspend(t, admin, caio);

      const detail = await t.gql<{
        tweet: { content: string; replies: { content: string }[] };
      }>(
        `query ($id: ID!) { tweet(id: $id) { content replies { content } } }`,
        { id },
      );
      const profile = await t.gql(
        `query ($u: String!) { userByUsername(username: $u) { username followersCount followedByMe } userTweets(username: $u) { content } userReplies(username: $u) { content } }`,
        { u: ana.user.username },
      );
      const suspendedProfile = await t.gql(
        `query ($u: String!) { userByUsername(username: $u) { username } }`,
        { u: caio.user.username },
      );
      const suspendedTweet = await t.gql(
        `query ($id: ID!) { tweet(id: $id) { content } }`,
        { id: caioTweet },
      );
      const suspendedReply = await t.gql(
        `query ($id: ID!) { tweet(id: $id) { content } }`,
        { id: replyOfSuspended },
      );
      const suspendedTab = await t.gql(
        `query ($u: String!) { userTweets(username: $u) { content } }`,
        { u: caio.user.username },
      );
      // Quem está logado continua vendo (o ADMIN precisa do perfil para reativar).
      const asAdmin = await t.gql(
        `query ($u: String!) { userByUsername(username: $u) { suspended } }`,
        { u: caio.user.username },
        admin.accessToken,
      );
      const detailAsAdmin = await t.gql<{
        tweet: { replies: { content: string }[] };
      }>(
        `query ($id: ID!) { tweet(id: $id) { replies { content } } }`,
        { id },
        admin.accessToken,
      );

      expect(detail.body.data!.tweet.replies).toEqual([
        { content: 'minha resposta' },
      ]);
      expect(profile.body.data).toEqual({
        userByUsername: {
          username: ana.user.username,
          followersCount: 0,
          followedByMe: false,
        },
        userTweets: [{ content: 'pio da ana' }],
        userReplies: [{ content: 'minha resposta' }],
      });
      for (const response of [
        suspendedProfile,
        suspendedTweet,
        suspendedReply,
        suspendedTab,
      ]) {
        expect(codeOf(response.body)).toBe('NOT_FOUND');
      }
      expect(asAdmin.body.data).toEqual({
        userByUsername: { suspended: true },
      });
      expect(detailAsAdmin.body.data!.tweet.replies).toHaveLength(2);
    });

    it('as listas de seguidores, seguindo e quem curtiu não mostram contas suspensas', async () => {
      const admin = await signup(t, 'admin');
      const ana = await signup(t, 'ana');
      const bia = await signup(t, 'bia');
      const caio = await signup(t, 'caio');
      await makeAdmin(t, admin);
      const id = await publish(t, ana, 'pio da ana');
      for (const who of [bia, caio]) {
        await follow(t, who, ana);
        await follow(t, ana, who);
        await toggleLike(t, who, id);
      }
      await suspend(t, admin, caio);

      const { body } = await t.gql<{
        followers: { username: string }[];
        following: { username: string }[];
        tweetLikes: { username: string }[];
      }>(
        `query ($u: String!, $id: ID!) {
          followers(username: $u) { username }
          following(username: $u) { username }
          tweetLikes(tweetId: $id) { username }
        }`,
        { u: ana.user.username, id },
        ana.accessToken,
      );

      const onlyBia = [{ username: bia.user.username }];
      expect(body.data).toEqual({
        followers: onlyBia,
        following: onlyBia,
        tweetLikes: onlyBia,
      });
    });
  });

  describe('o que exige login', () => {
    it('visitante não publica, não curte, não segue e não lê o que é da conta (UNAUTHENTICATED)', async () => {
      const ana = await signup(t, 'ana');
      const id = await publish(t, ana, 'pio da ana');
      const operations = [
        `mutation { createTweet(input: { content: "oi" }) { id } }`,
        `mutation { toggleLike(input: { tweetId: "${id}" }) { liked } }`,
        `mutation { followUser(input: { userId: "${ana.user.id}" }) }`,
        `mutation { markNotificationsRead }`,
        `mutation { logoutAll }`,
        `query { me { id } }`,
        `query { feed { id } }`,
        `query { notifications { id } }`,
        `query { unreadNotificationsCount }`,
        `query { suggestedUsers { id } }`,
        `query { searchUsers(query: "ana") { id } }`,
        `query { followers(username: "${ana.user.username}") { id } }`,
        `query { following(username: "${ana.user.username}") { id } }`,
        `query { tweetLikes(tweetId: "${id}") { id } }`,
        `query { likedTweets(username: "${ana.user.username}") { id } }`,
        `query { suspendedUsers { id } }`,
      ];

      const codes = await Promise.all(
        operations.map(async (query) => codeOf((await t.gql(query)).body)),
      );

      expect(codes).toEqual(operations.map(() => 'UNAUTHENTICATED'));
    });

    it('token inválido numa operação aberta continua dando UNAUTHENTICATED (é o que faz o front renovar a sessão)', async () => {
      const { body } = await t.gql(TOP, {}, 'token.inventado.aqui');

      expect(codeOf(body)).toBe('UNAUTHENTICATED');
    });
  });
});
