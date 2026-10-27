import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import {
  type ComplexityEstimator,
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

// Lista com `limit` (feed, seguidores, curtidas...): custa o que cada item
// custa vezes quantos itens podem vir. Assim, pedir 100 pios com o autor de
// cada um custa bem mais que pedir 1.
const listByLimitEstimator: ComplexityEstimator = ({
  args,
  childComplexity,
}) => {
  if (typeof args.limit !== 'number') return undefined;
  return 1 + childComplexity * args.limit;
};

// Mede o "custo" de uma consulta antes de executá-la e recusa as caras demais.
// Sem isso, uma consulta só (ex.: feed → respostas → respostas → ...) pode
// pedir milhões de documentos ao banco.
export function createQueryComplexityPlugin(
  maxComplexity: number,
): ApolloServerPlugin {
  return {
    requestDidStart: ({ schema }) =>
      Promise.resolve({
        // Roda depois de o Apollo entender a consulta e antes de executá-la.
        didResolveOperation: ({ request, document }) => {
          let complexity: number;
          try {
            complexity = getComplexity({
              schema,
              query: document,
              operationName: request.operationName,
              variables: request.variables,
              // O primeiro que der um número vence:
              // 1. o custo declarado no próprio campo ({ complexity } no
              //    @ResolveField, como o `replies`);
              // 2. listas com `limit`;
              // 3. qualquer outro campo custa 1 (mais o custo dos filhos).
              estimators: [
                fieldExtensionsEstimator(),
                listByLimitEstimator,
                simpleEstimator({ defaultComplexity: 1 }),
              ],
            });
          } catch {
            // Variáveis inválidas (ex.: limit: null) impedem o cálculo. Não é
            // erro nosso: deixa a execução seguir e devolver o erro de
            // validação certo (BAD_USER_INPUT) em vez de um erro interno.
            return Promise.resolve();
          }
          if (complexity > maxComplexity) {
            throw new GraphQLError(
              `Consulta complexa demais (custo ${complexity}, máximo ${maxComplexity}). Peça menos campos ou menos itens.`,
              {
                extensions: {
                  code: 'QUERY_TOO_COMPLEX',
                  http: { status: 400 },
                },
              },
            );
          }
          return Promise.resolve();
        },
      }),
  };
}
