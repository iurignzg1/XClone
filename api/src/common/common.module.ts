import { Global, Module } from '@nestjs/common';

// Ponto central para o que é compartilhado entre módulos
// (decorators, filtros, pipes, utilitários). Global para não precisar importar em todo lugar.
@Global()
@Module({})
export class CommonModule {}
