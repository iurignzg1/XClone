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
    }),
    {
      name: 'xclone-session',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);
