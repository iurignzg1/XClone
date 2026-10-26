import type { CodegenConfig } from '@graphql-codegen/cli';

// Lê o schema da API e as operações .graphql do front, e gera os tipos e os
// documentos tipados em src/gql. Rode `npm run codegen` depois de mudar um deles.
const config: CodegenConfig = {
  schema: '../api/schema.gql',
  documents: 'src/**/*.graphql',
  generates: {
    'src/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        // Sem isso, o DateTime do GraphQL viraria `any`.
        scalars: { DateTime: 'string' },
        useTypeImports: true,
      },
    },
  },
};

export default config;
