import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuthStore } from '../features/auth/auth.store';
import { useLogout } from '../features/auth/useLogout';
import { ThemeToggle } from '../features/ui/ThemeToggle';
import { Avatar } from './Avatar';
import { HomeIcon, ShieldIcon, UserIcon } from './icons';
import { Logo } from './Logo';
import styles from './AppShell.module.css';
import shared from '../styles/shared.module.css';

function Item({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink to={to} end className={styles.item}>
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}

// Moldura das telas logadas: barra lateral (no celular vira um cabeçalho) e a
// coluna central com o conteúdo da rota.
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const { endSession, loading } = useLogout();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo />
          <h1>Pio</h1>
          <ThemeToggle />
        </div>
        <nav className={styles.nav} aria-label="Principal">
          <Item to="/home" icon={<HomeIcon />}>Home</Item>
          {user && <Item to={`/${user.username}`} icon={<UserIcon />}>Meu perfil</Item>}
          {user?.role === 'ADMIN' && <Item to="/admin" icon={<ShieldIcon />}>Admin</Item>}
        </nav>
        {user && (
          <div className={styles.account}>
            <Avatar username={user.username} displayName={user.displayName} />
            <div className={styles.who}>
              <strong>{user.displayName}</strong>
              <span className={shared.muted}>
                @{user.username}
                {user.role !== 'USER' && ` · ${user.role}`}
              </span>
            </div>
            <div className={styles.exit}>
              <button className={shared.outline} onClick={() => void endSession(false)} disabled={loading}>
                Sair
              </button>
              <button className={shared.outline} onClick={() => void endSession(true)} disabled={loading}>
                Sair de todos os aparelhos
              </button>
            </div>
          </div>
        )}
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
