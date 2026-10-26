import { useEffect, useState } from 'react';
import { useAuthStore } from './auth.store';
import { refreshAccessToken } from './refresh';

// Ao abrir ou recarregar a página, o access token não existe mais (ele só vive
// em memória), mas o refresh token continua no localStorage. Aqui trocamos um
// pelo outro. Devolve true quando terminou, para a tela não piscar "deslogado".
export function useRestoreSession(): boolean {
  // Sem refresh token guardado, não há nada para restaurar.
  const [ready, setReady] = useState(
    () => useAuthStore.getState().refreshToken === null,
  );

  useEffect(() => {
    if (ready) return;
    void refreshAccessToken().finally(() => setReady(true));
  }, [ready]);

  return ready;
}
