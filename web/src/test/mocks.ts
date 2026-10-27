import { GraphQLError } from 'graphql';
import { useAuthStore, type SessionUser } from '../features/auth/auth.store';
import {
  DeleteTweetDocument,
  FeedDocument,
  LoginDocument,
  SearchUsersDocument,
  ToggleLikeDocument,
  TweetDocument,
  TweetLikesDocument,
  UpdateProfileDocument,
  UserByUsernameDocument,
  UserTweetsDocument,
} from '../gql/graphql';

// Dados e respostas de mentira usados pelos testes. O MockedProvider age como
// um servidor GraphQL falso: cada mock diz "se o app fizer ESTA operação com
// ESTAS variáveis, responda ISTO".

// ---- Pessoas -------------------------------------------------------------

// Ana é quem está logada nos testes; Bia e Caio são os outros usuários.
export const ana = { id: 'u1', username: 'ana', displayName: 'Ana' };
export const bia = { id: 'u2', username: 'bia', displayName: 'Bia' };
export const caio = { id: 'u3', username: 'caio', displayName: 'Caio' };

const asUser = (person: typeof ana) => ({ __typename: 'User', ...person });

// ---- Dados ---------------------------------------------------------------

// Um pio da Bia; `over` troca só o que o teste quer mudar.
export const tweet = (over: Record<string, unknown> = {}) => ({
  __typename: 'Tweet',
  id: 't1',
  content: 'olá mundo',
  createdAt: '2026-10-26T12:00:00.000Z',
  parentId: null,
  likesCount: 0,
  likedByMe: false,
  repliesCount: 0,
  author: asUser(bia),
  ...over,
});

// `count` pios numerados (t1, t2...; "pio 1", "pio 2"...) para testar páginas.
export const manyTweets = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    tweet({ id: `t${i + 1}`, content: `pio ${i + 1}` }),
  );

// ---- Respostas da API ------------------------------------------------------

export const feedMock = (tweets: unknown[], variables: Record<string, unknown> = { limit: 20 }) => ({
  request: { query: FeedDocument, variables },
  result: { data: { feed: tweets } },
});

export const feedOfflineMock = () => ({
  request: { query: FeedDocument, variables: { limit: 20 } },
  error: new TypeError('Failed to fetch'),
});

export const toggleLikeMock = (tweetId: string, likesCount: number) => ({
  request: { query: ToggleLikeDocument, variables: { input: { tweetId } } },
  result: {
    data: { toggleLike: { __typename: 'ToggleLikePayload', liked: likesCount > 0, likesCount } },
  },
});

export const tweetLikesMock = (tweetId: string, people: (typeof ana)[], followedByMe: boolean) => ({
  request: { query: TweetLikesDocument, variables: { tweetId } },
  result: {
    data: { tweetLikes: people.map((person) => ({ ...asUser(person), followedByMe })) },
  },
});

export const deleteForbiddenMock = (tweetId: string) => ({
  request: { query: DeleteTweetDocument, variables: { input: { tweetId } } },
  result: {
    errors: [
      new GraphQLError('Você só pode apagar os seus próprios pios', {
        extensions: { code: 'FORBIDDEN' },
      }),
    ],
  },
});

export const tweetDetailMock = (id: string, replies: unknown[] = []) => ({
  request: { query: TweetDocument, variables: { id } },
  result: { data: { tweet: { ...tweet({ id }), replies } } },
});

export const profileMock = (person: typeof ana, bio: string, role = 'USER') => ({
  request: { query: UserByUsernameDocument, variables: { username: person.username } },
  result: {
    data: {
      userByUsername: {
        ...asUser(person),
        bio,
        cover: 'grafite',
        role,
        suspended: false,
        followersCount: 3,
        followingCount: 1,
        followedByMe: false,
      },
    },
  },
});

export const updateProfileMock = (displayName: string, bio: string, cover = 'grafite') => ({
  request: { query: UpdateProfileDocument, variables: { input: { displayName, bio, cover } } },
  result: {
    data: {
      updateProfile: {
        __typename: 'Me',
        ...ana,
        displayName,
        email: 'ana@x.com',
        role: 'USER',
      },
    },
  },
});

export const searchUsersMock = (query: string, people: (typeof ana)[]) => ({
  request: { query: SearchUsersDocument, variables: { query } },
  result: { data: { searchUsers: people.map(asUser) } },
});

export const userTweetsMock = (username: string, tweets: unknown[]) => ({
  request: { query: UserTweetsDocument, variables: { username } },
  result: { data: { userTweets: tweets } },
});

export const loginMock = (email: string, password: string) => ({
  request: { query: LoginDocument, variables: { input: { email, password } } },
  result: {
    data: {
      login: {
        __typename: 'AuthPayload',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { __typename: 'Me', ...ana, email: 'ana@x.com', role: 'USER' },
      },
    },
  },
});

// ---- Sessão ----------------------------------------------------------------

// Simula "estar logado" sem passar pelo login. refreshToken nulo evita a
// tentativa de restaurar a sessão pela rede.
export function loginAs(role: SessionUser['role'] = 'USER') {
  useAuthStore.setState({
    user: { ...ana, email: 'ana@x.com', role },
    accessToken: 'token',
    refreshToken: null,
  });
}

export function logout() {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  localStorage.clear();
}
