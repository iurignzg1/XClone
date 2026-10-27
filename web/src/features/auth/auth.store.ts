import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SignupMutation } from '../../gql/graphql';

export type SessionUser = SignupMutation['signup']['user'];

export interface Session {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: SessionUser | null;
  // Só em memória: some ao recarregar a página (e é recuperado pelo refresh).
  accessToken: string | null;
  // Único dado que vai para o localStorage.
  refreshToken: string | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
  // Atualiza campos do usuário logado (ex.: o nome depois de editá-lo).
  updateUser: (patch: Partial<SessionUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
      updateUser: (patch) =>
        set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
    }),
    {
      name: 'pio-session',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);
