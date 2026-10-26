import { useSyncExternalStore } from 'react';
import { useUiStore, type Theme } from './ui.store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystem(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

// O tema que está de fato na tela: a escolha do usuário, ou, se ele ainda não
// escolheu, o do sistema (acompanhando se o sistema mudar).
export function useEffectiveTheme(): Theme {
  const chosen = useUiStore((s) => s.theme);
  const systemDark = useSyncExternalStore(subscribeToSystem, systemPrefersDark);
  return chosen ?? (systemDark ? 'dark' : 'light');
}
