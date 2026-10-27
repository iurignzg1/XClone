import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuthStore } from '../features/auth/auth.store';
import { ThemeToggle } from '../features/ui/ThemeToggle';
import { AccountMenu } from './AccountMenu';
import { HomeIcon, SearchIcon, ShieldIcon } from './icons';
import { Logo } from './Logo';
import styles from './AppShell.module.css';

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
          <Item to="/pesquisar" icon={<SearchIcon />}>Pesquisar</Item>
          {user?.role === 'ADMIN' && <Item to="/admin" icon={<ShieldIcon />}>Admin</Item>}
        </nav>
        {user && <AccountMenu user={user} />}
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
