import { unwrapResolverError } from '@apollo/server/errors';
import { HttpException } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';

// O front decide o que fazer pelo extensions.code (ex.: UNAUTHENTICATED
// dispara o refreshSession), então mapeamos o status HTTP do Nest para ele.
const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_USER_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor';

export interface GraphQLErrorFormatterOptions {
  // true em desenvolvimento: mostra a mensagem real dos erros inesperados.
  exposeInternalErrors: boolean;
}

export function createGraphQLErrorFormatter({
  exposeInternalErrors,
}: GraphQLErrorFormatterOptions) {
  return (
    formatted: GraphQLFormattedError,
    error: unknown,
  ): GraphQLFormattedError => {
    const original = unwrapResolverError(error);

    // Erros que nós mesmos lançamos (4xx) são para o cliente: mensagem e
    // código seguem como estão, em qualquer ambiente.
    if (original instanceof HttpException && original.getStatus() < 500) {
      return {
        ...formatted,
        message: messageOf(original),
        extensions: {
          ...withoutOriginalError(formatted.extensions),
          code:
            CODE_BY_STATUS[original.getStatus()] ?? formatted.extensions?.code,
        },
      };
    }

    // Erros do próprio GraphQL (campo inexistente, sintaxe, variável de tipo
    // errado) já vêm com código próprio e também são para o cliente.
    if (formatted.extensions?.code !== 'INTERNAL_SERVER_ERROR') {
      return formatted;
    }

    // Daqui em diante é erro inesperado (falha do banco, bug). O Nest já
    // registra a mensagem real no log da API ([ExceptionsHandler]); em
    // produção, o cliente recebe só uma genérica, porque ela pode conter
    // detalhes internos.
    if (exposeInternalErrors) return formatted;
    return {
      message: INTERNAL_ERROR_MESSAGE,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    };
  };
}

// O ValidationPipe devolve a lista de mensagens em response.message.
function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  const detail =
    typeof response === 'object' && 'message' in response
      ? (response as { message: string | string[] }).message
      : exception.message;
  return Array.isArray(detail) ? detail.join('; ') : detail;
}

// O Nest anexa a estrutura interna da exceção (statusCode, "Bad Request" e a
// mesma mensagem). Ela não ajuda o cliente, então não vai na resposta.
function withoutOriginalError(
  extensions: GraphQLFormattedError['extensions'],
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...extensions };
  delete copy.originalError;
  return copy;
}
