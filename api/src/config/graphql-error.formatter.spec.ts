import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { createGraphQLErrorFormatter } from './graphql-error.formatter.js';

// Simula o que o Apollo entrega ao formatError: o erro do resolver embrulhado
// num GraphQLError e a versão já formatada dele.
function fromResolver(original: Error, code = 'INTERNAL_SERVER_ERROR') {
  const error = new GraphQLError(original.message, {
    path: ['tweet'],
    originalError: original,
  });
  const formatted: GraphQLFormattedError = {
    message: original.message,
    path: ['tweet'],
    extensions: { code, stacktrace: ['linha 1', 'linha 2'] },
  };
  return { formatted, error };
}

describe('createGraphQLErrorFormatter', () => {
  const production = createGraphQLErrorFormatter({
    exposeInternalErrors: false,
  });
  const development = createGraphQLErrorFormatter({
    exposeInternalErrors: true,
  });

  describe('erros esperados (para o cliente)', () => {
    it('traduz o status do Nest para o código e mantém a mensagem', () => {
      const { formatted, error } = fromResolver(
        new NotFoundException('Pio não encontrado'),
      );

      const result = production(formatted, error);

      expect(result.message).toBe('Pio não encontrado');
      expect(result.extensions?.code).toBe('NOT_FOUND');
    });

    it('junta as mensagens do ValidationPipe numa só', () => {
      const { formatted, error } = fromResolver(
        new BadRequestException(['content é obrigatório', 'limit mínimo 1']),
      );

      const result = production(formatted, error);

      expect(result.message).toBe('content é obrigatório; limit mínimo 1');
      expect(result.extensions?.code).toBe('BAD_USER_INPUT');
    });

    it('não esconde um 4xx sem código mapeado (ex.: 429 do rate limit)', () => {
      const { formatted, error } = fromResolver(
        new HttpException('Muitas tentativas', 429),
      );

      const result = production(formatted, error);

      expect(result.message).toBe('Muitas tentativas');
    });

    it('não repassa a estrutura interna da exceção (originalError)', () => {
      const { formatted, error } = fromResolver(
        new NotFoundException('Pio não encontrado'),
      );
      const withOriginal: GraphQLFormattedError = {
        ...formatted,
        extensions: {
          ...formatted.extensions,
          originalError: { statusCode: 404, error: 'Not Found' },
        },
      };

      const result = production(withOriginal, error);

      expect(result.extensions).not.toHaveProperty('originalError');
      expect(result.extensions?.code).toBe('NOT_FOUND');
    });

    it('deixa passar os erros do próprio GraphQL, mesmo em produção', () => {
      const formatted: GraphQLFormattedError = {
        message: 'Cannot query field "email" on type "User".',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      };

      const result = production(formatted, new GraphQLError(formatted.message));

      expect(result).toEqual(formatted);
    });
  });

  describe('erros inesperados', () => {
    it('em produção, troca a mensagem por uma genérica e tira os detalhes', () => {
      const { formatted, error } = fromResolver(
        new Error('E11000 duplicate key: tweets index _id_ dup key'),
      );

      const result = production(formatted, error);

      expect(result).toEqual({
        message: 'Erro interno do servidor',
        locations: undefined,
        path: ['tweet'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    });

    it('em produção, também esconde um 5xx lançado de propósito', () => {
      const { formatted, error } = fromResolver(
        new InternalServerErrorException('detalhe interno'),
      );

      const result = production(formatted, error);

      expect(result.message).toBe('Erro interno do servidor');
    });

    it('em desenvolvimento, mostra a mensagem real para ajudar a depurar', () => {
      const { formatted, error } = fromResolver(new Error('falha no banco'));

      const result = development(formatted, error);

      expect(result.message).toBe('falha no banco');
    });
  });
});
