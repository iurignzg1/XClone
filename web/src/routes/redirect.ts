import type { Location } from 'react-router';

// O ProtectedRoute guarda no `state` do redirecionamento a página que o
// visitante queria abrir ({ from }); depois do login, voltamos para ela.
export const HOME = '/home';

export function originOf(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from;
  return from ? `${from.pathname}${from.search}${from.hash}` : HOME;
}
