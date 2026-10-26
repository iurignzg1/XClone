import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta o que cada teste renderizou, para um não vazar para o próximo.
afterEach(cleanup);

// O jsdom não implementa matchMedia. Por padrão, o "sistema" é o tema claro;
// os testes de tema trocam isso quando precisam.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList,
});
