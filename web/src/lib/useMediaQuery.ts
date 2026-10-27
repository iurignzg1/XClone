import { useSyncExternalStore } from 'react';

// true enquanto a media query (ex.: '(min-width: 1300px)') valer. Atualiza ao
// redimensionar a janela. Serve para decidir o que montar, não só o que mostrar.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
