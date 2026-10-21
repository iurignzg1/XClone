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

export function formatGraphQLError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);
  if (!(original instanceof HttpException)) return formatted;

  // O ValidationPipe devolve a lista de mensagens em response.message.
  const response = original.getResponse();
  const detail =
    typeof response === 'object' && 'message' in response
      ? (response as { message: string | string[] }).message
      : original.message;

  return {
    ...formatted,
    message: Array.isArray(detail) ? detail.join('; ') : detail,
    extensions: {
      ...formatted.extensions,
      code: CODE_BY_STATUS[original.getStatus()] ?? formatted.extensions?.code,
    },
  };
}
