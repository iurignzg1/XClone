import { useMutation } from '@apollo/client/react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { ErrorBox } from '../../components/ErrorBox';
import { SignupDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { field } from './field';
import { startSession } from './startSession';
import styles from './auth.module.css';
import shared from '../../styles/shared.module.css';

export function SignupPage() {
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
    <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
      <h2>Criar conta</h2>
      <label className={styles.field}>
        Nome de exibição
        <input name="displayName" placeholder="Como você quer aparecer" autoComplete="name" required />
      </label>
      <label className={styles.field}>
        Usuário
        <input name="username" placeholder="ana_silva" autoComplete="username" required />
        <span className={styles.hint}>De 3 a 15 caracteres: letras, números e _.</span>
      </label>
      <label className={styles.field}>
        E-mail
        <input name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" required />
      </label>
      <label className={styles.field}>
        Senha
        <input name="password" type="password" autoComplete="new-password" required />
        <span className={styles.hint}>No mínimo 8 caracteres.</span>
      </label>
      <button className={`${shared.primary} ${styles.submit}`} disabled={loading}>{loading ? 'Criando…' : 'Criar conta'}</button>
      <ErrorBox error={error} />
      <p className={`${shared.muted} ${styles.switch}`}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  );
}
