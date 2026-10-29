import { useAuthStore } from './auth.store';
import { useUiStore } from '../ui/ui.store';

// Para ações que só quem tem conta faz (curtir, seguir...). Devolve uma função:
// logado, ela devolve true e a ação segue; visitante, ela abre o aviso "entre
// para continuar" (com o que ele tentou fazer) e devolve false.
//   if (requireLogin('curtir este pio')) curtir();
export function useRequireLogin() {
  const user = useAuthStore((s) => s.user);
  const askLogin = useUiStore((s) => s.askLogin);
  return (reason: string): boolean => {
    if (user) return true;
    askLogin(reason);
    return false;
  };
}
