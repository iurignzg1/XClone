/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Endereço do GraphQL da API. Sem ele, usa http://localhost:3000/graphql.
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
