import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';

// Os testes e2e sobem a API inteira (todos os módulos, guards, validação,
// rate limit, helmet) e conversam com ela por HTTP, como o front faz. O banco é
// um MongoDB temporário, criado na memória só para os testes: o Atlas de
// verdade nunca é tocado.

export interface GqlError {
  message: string;
  extensions?: { code?: string };
}

export interface GqlBody<T> {
  data?: T | null;
  errors?: GqlError[];
}

export interface TestApp {
  app: INestApplication<App>;
  // Acesso direto ao banco, para preparar cenários (ex.: promover a ADMIN).
  db: Connection;
  gql<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    accessToken?: string,
  ): Promise<{
    status: number;
    body: GqlBody<T>;
    headers: Record<string, string>;
  }>;
  close(): Promise<void>;
}

export function startMongo(): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create();
}

// O .env é lido quando o AppModule é importado pela primeira vez; por isso as
// variáveis são definidas antes e o import é dinâmico. O process.env vence o
// arquivo .env, então o MONGODB_URI do Atlas não é usado.
export async function createTestApp(
  mongoUri: string,
  env: Record<string, string> = {},
): Promise<TestApp> {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: mongoUri,
    JWT_ACCESS_SECRET: 'segredo-dos-testes-e2e-com-mais-de-32-caracteres',
    ...env,
  });
  const { AppModule } = await import('../../src/app/app.module.js');
  const { configureApp } = await import('../../src/app/configure-app.js');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  try {
    await app.init();
  } catch (error) {
    // Sem isso, a conexão com o banco fica aberta e o Jest não termina.
    await app.close();
    throw error;
  }

  const db = app.get<Connection>(getConnectionToken());
  // Trava de segurança: se algo der errado com as variáveis, os testes param
  // aqui em vez de escrever no banco de verdade.
  if (db.host !== '127.0.0.1') {
    await app.close();
    throw new Error(`e2e conectado a ${db.host}, e não ao banco de teste`);
  }

  return {
    app,
    db,
    async gql(query, variables, accessToken) {
      const req = request(app.getHttpServer()).post('/graphql');
      if (accessToken) req.set('Authorization', `Bearer ${accessToken}`);
      const res = await req.send({ query, variables });
      return {
        status: res.status,
        body: res.body as GqlBody<never>,
        headers: res.headers,
      };
    },
    close: () => app.close(),
  };
}

export function codeOf(body: GqlBody<unknown>): string | undefined {
  return body.errors?.[0]?.extensions?.code;
}
