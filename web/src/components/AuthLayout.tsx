import { Outlet } from 'react-router';
import { ThemeToggle } from '../features/ui/ThemeToggle';
import { Logo } from './Logo';
import styles from './AuthLayout.module.css';

// Moldura das telas públicas: um cartão centralizado, com a marca no alto.
export function AuthLayout() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header className={styles.brand}>
          <Logo />
          <h1>Pio</h1>
          <ThemeToggle />
        </header>
        <Outlet />
      </div>
    </main>
  );
}
