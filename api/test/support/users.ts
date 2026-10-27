import type { TestApp } from './test-app.js';

export const PASSWORD = 'senha-dos-testes';

export interface TestSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; email: string };
}

const SIGNUP = `
  mutation ($input: SignupInput!) {
    signup(input: $input) {
      accessToken
      refreshToken
      user { id username email }
    }
  }
`;

let counter = 0;

// Cria uma conta nova pela API (o mesmo caminho do front) e devolve a sessão.
// O contador garante usernames e e-mails diferentes dentro do mesmo arquivo.
export async function signup(
  t: TestApp,
  name = 'pessoa',
): Promise<TestSession> {
  counter += 1;
  const username = `${name}${counter}`;
  const { body } = await t.gql<{ signup: TestSession }>(SIGNUP, {
    input: {
      username,
      email: `${username}@teste.com`,
      password: PASSWORD,
      displayName: name,
    },
  });
  if (!body.data) {
    throw new Error(`signup falhou: ${JSON.stringify(body.errors)}`);
  }
  return body.data.signup;
}
