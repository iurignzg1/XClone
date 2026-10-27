import { MoonIcon, SunIcon } from '../../components/icons';
import { useEffectiveTheme } from './useEffectiveTheme';
import { useUiStore } from './ui.store';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const current = useEffectiveTheme();
  const setTheme = useUiStore((s) => s.setTheme);
  // O botão mostra para onde ele leva, não onde você está. Só o ícone aparece
  // (assim o tamanho não muda de um tema para o outro); o texto fica no
  // aria-label e na dica ao passar o mouse.
  const next = current === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Tema escuro' : 'Tema claro';

  return (
    <button type="button" className={styles.toggle} onClick={() => setTheme(next)} aria-label={label} title={label}>
      {next === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
