import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { useUiStore } from './ui.store';

// Faz o "tema do sistema" ser claro ou escuro, como o prefers-color-scheme.
function systemTheme(theme: 'light' | 'dark') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: theme === 'dark' && query.includes('dark'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const attribute = () => document.documentElement.dataset.theme;

beforeEach(() => {
  systemTheme('light');
});

afterEach(() => {
  vi.unstubAllGlobals();
  useUiStore.setState({ theme: null });
  localStorage.clear();
});

describe('ThemeToggle', () => {
  it('sem escolha, segue o sistema e não força nenhum tema na página', () => {
    render(<ThemeToggle />);

    expect(attribute()).toBeUndefined();
    // Sistema claro: o botão leva ao escuro.
    expect(screen.getByRole('button', { name: 'Tema escuro' })).toBeInTheDocument();
  });

  it('ao apertar, troca o tema na página e o botão passa a levar de volta', async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Tema escuro' }));

    expect(attribute()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Tema claro' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tema claro' }));

    expect(attribute()).toBe('light');
    expect(screen.getByRole('button', { name: 'Tema escuro' })).toBeInTheDocument();
  });

  it('a escolha manda mais que o sistema: sistema escuro, usuário escolhe claro', async () => {
    systemTheme('dark');
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Tema claro' }));

    expect(attribute()).toBe('light');
    expect(screen.getByRole('button', { name: 'Tema escuro' })).toBeInTheDocument();
  });

  it('guarda a escolha no localStorage e a recupera ao recarregar', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Tema escuro' }));

    const saved = localStorage.getItem('pio-ui') ?? '';
    expect(JSON.parse(saved)).toMatchObject({ state: { theme: 'dark' } });

    // Simula recarregar a página: a memória começa vazia e o que estava salvo
    // no localStorage é lido de volta. (setState também regrava o localStorage,
    // por isso devolvemos o conteúdo salvo antes de ler.)
    useUiStore.setState({ theme: null });
    localStorage.setItem('pio-ui', saved);
    await useUiStore.persist.rehydrate();

    expect(useUiStore.getState().theme).toBe('dark');
    expect(attribute()).toBe('dark');
  });
});
