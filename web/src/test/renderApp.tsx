import { MockedProvider } from '@apollo/client/testing/react';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import App from '../App';
import { createCache } from '../apollo/client';

type Mocks = ComponentProps<typeof MockedProvider>['mocks'];

// Renderiza o app inteiro numa rota (path), com a API falsa dos mocks e o
// mesmo cache (com a paginação) do app de verdade.
export function renderApp(path = '/home', mocks: Mocks = []) {
  return render(
    <MockedProvider mocks={mocks} cache={createCache()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MockedProvider>,
  );
}
