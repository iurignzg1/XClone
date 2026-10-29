import type { TestApp } from './test-app.js';
import type { TestSession } from './users.js';

// As ações que vários testes e2e repetem, feitas pela API como o front faz.
// Cada uma devolve a resposta inteira, para o teste poder conferir erros.

export async function publish(
  t: TestApp,
  author: TestSession,
  content: string,
  parentId?: string,
): Promise<string> {
  const { body } = await t.gql<{ createTweet: { id: string } }>(
    `mutation ($input: CreateTweetInput!) { createTweet(input: $input) { id } }`,
    { input: { content, parentId } },
    author.accessToken,
  );
  if (!body.data) {
    throw new Error(`createTweet falhou: ${JSON.stringify(body.errors)}`);
  }
  return body.data.createTweet.id;
}

export function toggleLike(t: TestApp, who: TestSession, tweetId: string) {
  return t.gql<{ toggleLike: { liked: boolean; likesCount: number } }>(
    `mutation ($input: ToggleLikeInput!) {
      toggleLike(input: $input) { liked likesCount }
    }`,
    { input: { tweetId } },
    who.accessToken,
  );
}

export function follow(t: TestApp, who: TestSession, target: TestSession) {
  return t.gql(
    `mutation ($input: FollowUserInput!) { followUser(input: $input) }`,
    { input: { userId: target.user.id } },
    who.accessToken,
  );
}

export function unfollow(t: TestApp, who: TestSession, target: TestSession) {
  return t.gql(
    `mutation ($input: FollowUserInput!) { unfollowUser(input: $input) }`,
    { input: { userId: target.user.id } },
    who.accessToken,
  );
}

export function deleteTweet(t: TestApp, who: TestSession, tweetId: string) {
  return t.gql(
    `mutation ($input: DeleteTweetInput!) { deleteTweet(input: $input) }`,
    { input: { tweetId } },
    who.accessToken,
  );
}

export function suspend(t: TestApp, admin: TestSession, target: TestSession) {
  return t.gql<{ suspendUser: { suspended: boolean } }>(
    `mutation ($input: SuspendUserInput!) {
      suspendUser(input: $input) { suspended }
    }`,
    { input: { userId: target.user.id } },
    admin.accessToken,
  );
}

// Apaga todos os dados (os índices ficam). Para testes de consultas globais,
// como a lista dos mais curtidos, que enxergam os dados de todos os testes do
// arquivo (o banco é um só por arquivo).
export async function clearData(t: TestApp): Promise<void> {
  const collections = await t.db.listCollections();
  await Promise.all(
    collections.map(({ name }) => t.db.collection(name).deleteMany({})),
  );
}

// Não existe mutation para virar ADMIN (de propósito): preparamos no banco.
export async function makeAdmin(t: TestApp, who: TestSession): Promise<void> {
  await t.db
    .collection('users')
    .updateOne({ username: who.user.username }, { $set: { role: 'ADMIN' } });
}
