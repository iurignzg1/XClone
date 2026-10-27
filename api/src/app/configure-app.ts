import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import {
  Environment,
  type EnvironmentVariables,
} from '../config/env.validation.js';

// O que fica em volta da API (camada HTTP). Separado do main.ts para os testes
// e2e montarem a API do mesmo jeito que ela roda de verdade.
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const isProduction =
    config.get('NODE_ENV', { infer: true }) === Environment.Production;

  // Helmet: cabeçalhos de segurança em toda resposta (ex.: nosniff, que impede
  // o navegador de "adivinhar" o tipo do conteúdo, e o bloqueio de abrir a API
  // dentro de um iframe de outro site).
  // A CSP (lista do que uma página pode carregar) fica desligada fora de
  // produção porque o GraphiQL, a página de testes em /graphql, carrega
  // scripts do unpkg. Em produção não há GraphiQL e a CSP padrão vale.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));

  // CORS: o navegador só deixa o front (CORS_ORIGIN) ler as respostas da API.
  // Postman, curl e testes não passam por essa regra; ela é do navegador.
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }).split(','),
  });
}
