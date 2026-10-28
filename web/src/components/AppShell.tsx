import { useQuery } from '@apollo/client/react';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuthStore } from '../features/auth/auth.store';
import { WhoToFollow } from '../features/profile/WhoToFollow';
import { ComposerModal } from '../features/tweets/ComposerModal';
import { useUiStore } from '../features/ui/ui.store';
import { WIDE_LAYOUT } from '../lib/layout';
import { useMediaQuery } from '../lib/useMediaQuery';
import { ThemeToggle } from '../features/ui/ThemeToggle';
import { AccountMenu } from './AccountMenu';
import { UnreadNotificationsCountDocument } from '../gql/graphql';
import { BellIcon, HomeIcon, SearchIcon, ShieldIcon } from './icons';
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

// De quanto em quanto tempo o sino pergunta à API se há novidade.
const NOTIFICATIONS_POLL_MS = 30_000;

// "Notificações", com o número de novidades ao lado.
function NotificationsItem() {
  const { data } = useQuery(UnreadNotificationsCountDocument, { pollInterval: NOTIFICATIONS_POLL_MS });
  const unread = data?.unreadNotificationsCount ?? 0;
  return (
    <NavLink
      to="/notificacoes"
      end
      className={styles.item}
      aria-label={unread > 0 ? `Notificações (${unread} novas)` : 'Notificações'}
    >
      <BellIcon />
      <span>Notificações</span>
      {unread > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  );
}

// Moldura das telas logadas: barra lateral (no celular vira um cabeçalho) e a
// coluna central com o conteúdo da rota.
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const openComposer = useUiStore((s) => s.openComposer);
  // Com espaço sobrando, "Quem seguir" ganha a coluna da direita; senão fica na home.
  const wide = useMediaQuery(WIDE_LAYOUT);

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
          <NotificationsItem />
          {user?.role === 'ADMIN' && <Item to="/admin" icon={<ShieldIcon />}>Admin</Item>}
        </nav>
        <button className={`${shared.primary} ${styles.publish}`} onClick={openComposer}>
          Publicar
        </button>
        {user && <AccountMenu user={user} />}
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
      {wide && (
        <aside className={styles.extra} aria-label="Sugestões">
          <WhoToFollow />
        </aside>
      )}
      <ComposerModal />
    </div>
  );
}
