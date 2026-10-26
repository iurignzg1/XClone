import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { useAuthStore } from './features/auth/auth.store';
import {
  DeleteTweetDocument,
  FeedDocument,
  ToggleLikeDocument,
  TweetLikesDocument,
} from './gql/graphql';

// Os testes usam um servidor GraphQL de mentira (MockedProvider): cada mock diz
// "se o app fizer ESTA operação com ESTAS variáveis, responda ISTO".

const tweet = (over: Record<string, unknown> = {}) => ({
  __typename: 'Tweet',
  id: 't1',
  content: 'olá mundo',
  createdAt: '2026-10-26T12:00:00.000Z',
  parentId: null,
  likesCount: 0,
  likedByMe: false,
  author: { __typename: 'User', id: 'u2', username: 'bia', displayName: 'Bia' },
  ...over,
});

const feedMock = (tweets: unknown[]) => ({
  request: { query: FeedDocument, variables: { limit: 20 } },
  result: { data: { feed: tweets } },
});

// Simula "estar logado" sem passar pelo login. refreshToken nulo evita a
// tentativa de restaurar a sessão pela rede.
function loginAs(role: 'USER' | 'ADMIN' = 'USER') {
  useAuthStore.setState({
    user: { id: 'u1', username: 'ana', displayName: 'Ana', email: 'ana@x.com', role },
    accessToken: 'token',
    refreshToken: null,
  });
}

afterEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  localStorage.clear();
});

describe('App', () => {
  it('sem sessão, mostra criar conta e entrar, e esconde o resto', () => {
    render(
      <MockedProvider mocks={[]}>
        <App />
      </MockedProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Feed/ })).not.toBeInTheDocument();
  });

  it('logado, mostra quem é o usuário e o feed', async () => {
    loginAs();
    render(
      <MockedProvider mocks={[feedMock([tweet()])]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByText('olá mundo')).toBeInTheDocument();
    expect(screen.getByText(/@bia/)).toBeInTheDocument();
    expect(screen.getByText(/Logado como/)).toHaveTextContent('Ana');
  });

  it('curtir chama a mutation e o feed refeito mostra o coração cheio', async () => {
    loginAs();
    const toggle = {
      request: { query: ToggleLikeDocument, variables: { input: { tweetId: 't1' } } },
      result: { data: { toggleLike: { __typename: 'ToggleLikePayload', liked: true, likesCount: 1 } } },
    };
    render(
      <MockedProvider
        mocks={[
          feedMock([tweet()]),
          toggle,
          feedMock([tweet({ likesCount: 1, likedByMe: true })]),
        ]}
      >
        <App />
      </MockedProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /♡ Curtir \(0\)/ }));

    expect(await screen.findByRole('button', { name: /♥ Descurtir \(1\)/ })).toBeInTheDocument();
  });

  it('"Quem curtiu" lista os usuários que curtiram', async () => {
    loginAs();
    const likes = {
      request: { query: TweetLikesDocument, variables: { tweetId: 't1' } },
      result: {
        data: {
          tweetLikes: [
            { __typename: 'User', id: 'u3', username: 'caio', displayName: 'Caio', followedByMe: true },
          ],
        },
      },
    };
    render(
      <MockedProvider mocks={[feedMock([tweet({ likesCount: 1 })]), likes]}>
        <App />
      </MockedProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Quem curtiu' }));

    expect(await screen.findByText(/Caio @caio/)).toBeInTheDocument();
    expect(screen.getByText(/você segue/)).toBeInTheDocument();
  });

  it('mostra o código do erro quando o back recusa a ação (FORBIDDEN)', async () => {
    loginAs();
    const del = {
      request: { query: DeleteTweetDocument, variables: { input: { tweetId: 't1' } } },
      result: {
        errors: [
          new GraphQLError('Você só pode apagar os seus próprios tweets', {
            extensions: { code: 'FORBIDDEN' },
          }),
        ],
      },
    };
    render(
      <MockedProvider mocks={[feedMock([tweet()]), del]}>
        <App />
      </MockedProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Apagar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'FORBIDDEN: Você só pode apagar os seus próprios tweets',
    );
  });

  it('com a API fora do ar, explica o problema em vez de só "Failed to fetch"', async () => {
    loginAs();
    const offline = {
      request: { query: FeedDocument, variables: { limit: 20 } },
      error: new TypeError('Failed to fetch'),
    };
    render(
      <MockedProvider mocks={[offline]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não consegui falar com a API/);
    expect(screen.getByRole('alert')).toHaveTextContent(/npm run start/);
  });

  it('mostra a logo preta para o tema claro e a branca para o escuro', () => {
    render(
      <MockedProvider mocks={[]}>
        <App />
      </MockedProvider>,
    );

    const logos = screen.getAllByAltText('XClone');

    // O CSS escolhe qual das duas aparece; aqui conferimos que as duas existem.
    expect(logos.map((logo) => logo.getAttribute('src'))).toEqual([
      '/logo-preta.svg',
      '/logo-branca.svg',
    ]);
  });

  it('não oferece "seguir autor" nos próprios tweets', async () => {
    loginAs();
    render(
      <MockedProvider
        mocks={[
          feedMock([
            tweet({ author: { __typename: 'User', id: 'u1', username: 'ana', displayName: 'Ana' } }),
          ]),
        ]}
      >
        <App />
      </MockedProvider>,
    );

    await screen.findByText('olá mundo');

    expect(screen.queryByRole('button', { name: 'Seguir autor' })).not.toBeInTheDocument();
  });
});
