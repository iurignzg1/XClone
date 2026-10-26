import { useEffectiveTheme } from './useEffectiveTheme';
import { useUiStore } from './ui.store';

export function ThemeToggle() {
  const current = useEffectiveTheme();
  const setTheme = useUiStore((s) => s.setTheme);
  // O botão mostra para onde ele leva, não onde você está.
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <button type="button" className="theme-toggle" onClick={() => setTheme(next)}>
      {next === 'dark' ? '☾ Tema escuro' : '☀ Tema claro'}
    </button>
  );
}
