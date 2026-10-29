import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH_KEY = 'optionalAuth';

// Operação aberta a visitantes. Sem token, passa como visitante (sem
// req.user); com token, o token é conferido como em qualquer outra operação,
// então um token vencido ou inventado continua dando UNAUTHENTICATED (é o que
// faz o front renovar a sessão).
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
