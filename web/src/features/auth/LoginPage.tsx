import { useMutation } from '@apollo/client/react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { ErrorBox } from '../../components/ErrorBox';
import { LoginDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { field } from './field';
import { startSession } from './startSession';
import styles from './auth.module.css';
import shared from '../../styles/shared.module.css';

export function LoginPage() {
  const [login, { loading, error }] = useMutation(LoginDocument);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await attempt(async () => {
      const { data } = await login({
        variables: { input: { email: field(form, 'email'), password: field(form, 'password') } },
      });
      // Com a sessão criada, o PublicOnlyRoute leva para a página de origem.
      if (data) await startSession(data.login);
    });
  }

  return (
    <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
      <h2>Entrar</h2>
      <label className={styles.field}>
        E-mail
        <input name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" required />
      </label>
      <label className={styles.field}>
        Senha
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className={`${shared.primary} ${styles.submit}`} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      <ErrorBox error={error} />
      <p className={`${shared.muted} ${styles.switch}`}>
        Não tem conta? <Link to="/signup">Criar conta</Link>
      </p>
    </form>
  );
}
