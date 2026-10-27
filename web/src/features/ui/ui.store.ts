import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface UiState {
  // null = ainda sem escolha: vale o tema do sistema.
  theme: Theme | null;
  setTheme: (theme: Theme) => void;
  // Modal do composer (o "Publicar" da barra lateral). Não vai para o
  // localStorage: recarregar a página fecha o modal.
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
}

// Estado só da interface (não vem do servidor, então não é do Apollo).
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: null,
      setTheme: (theme) => set({ theme }),
      composerOpen: false,
      openComposer: () => set({ composerOpen: true }),
      closeComposer: () => set({ composerOpen: false }),
    }),
    { name: 'pio-ui', partialize: (state) => ({ theme: state.theme }) },
  ),
);

// O CSS troca as cores pelo atributo data-theme da página. Sem escolha, o
// atributo some e o CSS volta a seguir o tema do sistema (prefers-color-scheme).
function applyTheme(theme: Theme | null) {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
}

// Aplica já ao carregar (o Zustand lê o localStorage na hora) e a cada troca,
// antes de o React desenhar a primeira tela, para não piscar o tema errado.
applyTheme(useUiStore.getState().theme);
useUiStore.subscribe((state) => applyTheme(state.theme));
