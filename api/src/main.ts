import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // A porta vem do .env já validado (inteiro de 0 a 65535).
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  // CORS: o navegador só deixa o front (CORS_ORIGIN) ler as respostas da API.
  // Postman, curl e testes não passam por essa regra; ela é do navegador.
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }).split(','),
  });
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
