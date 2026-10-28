import type { EventEmitter2 } from '@nestjs/event-emitter';

// Substitui o EventEmitter2 nos testes unitários: anuncia para ninguém. O que
// cada evento provoca nos outros módulos (apagar curtidas, criar notificações)
// é testado nos e2e, com os módulos de verdade.
export const silentEvents = {
  emitAsync: () => Promise.resolve([]),
} as unknown as EventEmitter2;
