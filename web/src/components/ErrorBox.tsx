import { CombinedGraphQLErrors } from '@apollo/client';
import { API_URL } from '../config';

// "Failed to fetch" (Chrome), "NetworkError..." (Firefox) e "Load failed"
// (Safari): o navegador não conseguiu nem falar com a API.
const NETWORK_FAILURE = /failed to fetch|networkerror|load failed/i;

// Mostra o erro de uma operação. Os erros do back trazem um código (como
// FORBIDDEN ou NOT_FOUND), que ajuda a testar as regras.
export function ErrorBox({ error }: { error?: { message: string } }) {
  if (!error) return null;

  if (NETWORK_FAILURE.test(error.message)) {
    return (
      <p className="error" role="alert">
        Não consegui falar com a API em {API_URL}. Ela está rodando (
        <code>cd api &amp;&amp; npm run start</code>)? O endereço do front está
        liberado no CORS_ORIGIN da API?
      </p>
    );
  }

  const code = CombinedGraphQLErrors.is(error)
    ? error.errors[0]?.extensions?.code
    : undefined;
  return (
    <p className="error" role="alert">
      {typeof code === 'string' && <strong>{code}: </strong>}
      {error.message}
    </p>
  );
}
