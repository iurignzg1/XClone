import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { CommonModule } from '../common/common.module.js';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
} from '../common/decorators/rate-limit.decorator.js';
import { GqlThrottlerGuard } from '../common/guards/gql-throttler.guard.js';
import {
  Environment,
  EnvironmentVariables,
  validate,
} from '../config/env.validation.js';
import { createGraphQLErrorFormatter } from '../config/graphql-error.formatter.js';
import { createQueryComplexityPlugin } from '../config/query-complexity.plugin.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { FeedModule } from '../modules/feed/feed.module.js';
import { FollowsModule } from '../modules/follows/follows.module.js';
import { LikesModule } from '../modules/likes/likes.module.js';
import { TweetsModule } from '../modules/tweets/tweets.module.js';
import { UsersModule } from '../modules/users/users.module.js';

// Custo máximo de uma consulta (ver query-complexity.plugin.ts). A mais cara
// que o front faz, a página do pio com até 50 respostas, custa 563; o feed com
// o maior limit aceito (100) custa uns 1.100. Já pedir as respostas das
// respostas (replies { replies }) passa de 2.500 e é recusado.
const MAX_QUERY_COMPLEXITY = 2000;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    // Eventos entre módulos (ex.: tweet apagado → curtidas apagadas).
    EventEmitterModule.forRoot(),
    // Rate limit: cada operação aceita até DEFAULT_RATE_LIMIT chamadas por
    // minuto do mesmo IP; as sensíveis (login, criar pio...) têm @RateLimit
    // com um limite próprio. A contagem fica na memória do processo.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: RATE_LIMIT_WINDOW_MS, limit: DEFAULT_RATE_LIMIT }],
      errorMessage: 'Muitas tentativas. Espere um minuto e tente de novo.',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', { infer: true }),
      }),
    }),
    // Async para ler o NODE_ENV já validado e decidir como mostrar os erros.
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const isProduction =
          config.get('NODE_ENV', { infer: true }) === Environment.Production;
        return {
          autoSchemaFile: join(process.cwd(), 'schema.gql'),
          sortSchema: true,
          // Em produção, ninguém de fora precisa "ler o mapa" da API: sem
          // introspecção (a query que lista todos os tipos e campos), sem
          // GraphiQL e sem as dicas "Did you mean...?" nos erros, que também
          // revelam nomes de campos.
          introspection: !isProduction,
          graphiql: !isProduction,
          hideSchemaDetailsFromClientErrors: isProduction,
          plugins: [createQueryComplexityPlugin(MAX_QUERY_COMPLEXITY)],
          formatError: createGraphQLErrorFormatter({
            exposeInternalErrors: !isProduction,
          }),
          // O res vai junto para o rate limit poder escrever os cabeçalhos
          // X-RateLimit-* na resposta.
          context: ({ req, res }: { req: unknown; res: unknown }) => ({
            req,
            res,
          }),
        };
      },
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    TweetsModule,
    LikesModule,
    FollowsModule,
    FeedModule,
  ],
  providers: [
    // Antes dos guards de autenticação (AuthModule): quem passou do limite é
    // barrado sem gastar nem a conferência do token.
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    // Validação global de todo input e argumento (regras do class-validator).
    // Registrada aqui, e não no main.ts, para valer também quando a API é
    // montada pelos testes, que não passam pelo main.ts.
    // whitelist: descarta campos sem regra; transform: cria a instância da
    // classe (é o que faz o @Transform, como o trim do tweet, rodar).
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
