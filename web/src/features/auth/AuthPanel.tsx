import { useMutation } from '@apollo/client/react';
import type { FormEvent } from 'react';
import { apolloClient } from '../../apollo/client';
import { ErrorBox } from '../../components/ErrorBox';
import {
  LoginDocument,
  LogoutAllDocument,
  LogoutDocument,
  SignupDocument,
} from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore, type Session } from './auth.store';

// Troca de sessão: limpa o cache do Apollo antes, para não sobrar dado do
// usuário anterior (ex.: se a sessão anterior expirou sem logout).
async function startSession(session: Session) {
  await apolloClient.clearStore();
  useAuthStore.getState().setSession(session);
}

const field = (form: FormData, name: string) => String(form.get(name) ?? '');

function SignupForm() {
  const [signup, { loading, error }] = useMutation(SignupDocument);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await attempt(async () => {
      const { data } = await signup({
        variables: {
          input: {
            username: field(form, 'username'),
            email: field(form, 'email'),
            displayName: field(form, 'displayName'),
            password: field(form, 'password'),
          },
        },
      });
      if (data) await startSession(data.signup);
    });
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <h3>Criar conta</h3>
      <input name="displayName" placeholder="Nome de exibição" required />
      <input name="username" placeholder="Usuário (3 a 15: letras, números, _)" required />
      <input name="email" type="email" placeholder="E-mail" required />
      <input name="password" type="password" placeholder="Senha (mín. 8)" required />
      <button disabled={loading}>{loading ? 'Criando…' : 'Criar conta'}</button>
      <ErrorBox error={error} />
    </form>
  );
}

function LoginForm() {
  const [login, { loading, error }] = useMutation(LoginDocument);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await attempt(async () => {
      const { data } = await login({
        variables: {
          input: { email: field(form, 'email'), password: field(form, 'password') },
        },
      });
      if (data) await startSession(data.login);
    });
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <h3>Entrar</h3>
      <input name="email" type="email" placeholder="E-mail" required />
      <input name="password" type="password" placeholder="Senha" required />
      <button disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      <ErrorBox error={error} />
    </form>
  );
}

function SessionInfo() {
  const user = useAuthStore((s) => s.user);
  const [logout, logoutState] = useMutation(LogoutDocument);
  const [logoutAll, logoutAllState] = useMutation(LogoutAllDocument);

  async function endSession(everywhere: boolean) {
    const { refreshToken } = useAuthStore.getState();
    // Mesmo que a API não responda, o usuário quer sair: a sessão local sempre cai.
    await attempt(() =>
      everywhere
        ? logoutAll()
        : logout({ variables: { input: { refreshToken: refreshToken ?? '' } } }),
    );
    useAuthStore.getState().clearSession();
    await apolloClient.clearStore();
  }

  if (!user) return null;
  return (
    <div className="row">
      <p>
        Logado como <strong>{user.displayName}</strong> (@{user.username}) ·{' '}
        {user.email} · <code>{user.role}</code>
      </p>
      <div className="actions">
        <button onClick={() => void endSession(false)} disabled={logoutState.loading}>
          Sair
        </button>
        <button onClick={() => void endSession(true)} disabled={logoutAllState.loading}>
          Sair de todos os aparelhos
        </button>
      </div>
    </div>
  );
}

export function AuthPanel() {
  const user = useAuthStore((s) => s.user);
  return (
    <section>
      <h2>Sessão</h2>
      {user ? (
        <SessionInfo />
      ) : (
        <div className="grid2">
          <SignupForm />
          <LoginForm />
        </div>
      )}
    </section>
  );
}
