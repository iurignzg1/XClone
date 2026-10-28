# Pio

Um clone do X (antigo Twitter): publicar pios, responder, curtir, seguir pessoas e ver um feed com quem você segue. Tem também papéis de moderação (MODERATOR e ADMIN).

O repositório tem duas partes:

| Pasta | O que é | Stack |
|---|---|---|
| [`api/`](api) | API GraphQL | NestJS 12, GraphQL code-first (Apollo), MongoDB (Mongoose), JWT |
| [`web/`](web) | Front-end | React 19, Vite, Apollo Client 4, Zustand, React Router, CSS Modules |

## Como rodar

### O que você precisa

- **Node.js 24** ou mais novo.
- **Um MongoDB.** Pode ser um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas) ou um Mongo local (`mongodb://localhost:27017/pio`).

### 1. API

```bash
cd api
npm install
cp .env.example .env
```

Preencha o `.env`:

| Variável | Obrigatória | O que é |
|---|---|---|
| `MONGODB_URI` | sim | Endereço do banco (`mongodb://...` ou `mongodb+srv://...`) |
| `JWT_ACCESS_SECRET` | sim | Segredo que assina os tokens, com no mínimo 32 caracteres. Gere um com `openssl rand -base64 48` |
| `NODE_ENV` | sim | `development` para rodar localmente |
| `PORT` | não | Porta da API. Padrão: `3000` |
| `CORS_ORIGIN` | não | Endereço(s) do front, separados por vírgula. Padrão: `http://localhost:5173,http://127.0.0.1:5173` |

Se faltar algo ou algum valor for inválido, a API não sobe e diz qual variável está errada.

Suba a API:

```bash
npm run start:dev
```

A API fica em <http://localhost:3000/graphql>. Abrindo esse endereço no navegador, aparece o GraphiQL, uma página para testar consultas. Ele só existe fora de produção.

### 2. Dados de demonstração (opcional)

```bash
npm run seed -- --admin <seu_username>
```

O seed cria 20 contas, com pios, respostas, curtidas e seguidores, todas com a senha `pio-seed-123`. Com `--admin`, a sua conta (crie-a antes pelo front) vira ADMIN e passa a seguir, e ser seguida por, parte dessas contas.

`npm run seed:limpar` apaga tudo o que o seed criou e deixa o resto do banco como estava.

### 3. Front

Em outro terminal:

```bash
cd web
npm install
npm run dev
```

Abra <http://localhost:5173>. O front procura a API em `http://localhost:3000/graphql`. Para usar outro endereço, copie `web/.env.example` para `web/.env` e defina `VITE_API_URL`.

## Testes e qualidade

| Comando | Onde | O que faz |
|---|---|---|
| `npm test` | `api/` | Testes unitários dos services, guards, DTOs e da formatação de erros (Jest) |
| `npm run test:e2e` | `api/` | Testes de ponta a ponta: sobe a API inteira e conversa com ela por HTTP |
| `npm test` | `web/` | Testes das telas e componentes (Vitest + Testing Library) |
| `npm run lint:check` / `npm run lint` | `api/` / `web/` | ESLint |
| `npm run typecheck` | `api/` e `web/` | Checagem de tipos do TypeScript |

Os testes e2e não precisam de banco nenhum, nem do `.env`. Eles sobem um MongoDB temporário na memória (`mongodb-memory-server`), que é apagado no fim. Na primeira vez, o pacote baixa o binário do MongoDB, uns 100 MB.

Os testes unitários ficam com as regras que dependem só do código: prazos e corridas da sessão, curtidas simultâneas, DataLoaders, guards, validação. Tudo o que depende das consultas no Mongo (ordem, filtros, cursor, índices) é testado nos e2e, com o banco de verdade. Um caso não é repetido nos dois.

O que os e2e cobrem:

- **Autenticação:** cadastro, login, senha errada, renovação de sessão (inclusive o reuso de um refresh token roubado), logout, conta suspensa e o rate limit do login.
- **Curtidas:** curtir e descurtir, contagem por pessoa, cliques simultâneos, pio inexistente e o que acontece ao apagar o pio.
- **Feed e respostas:** seguir alguém muda o feed, as respostas ficam fora dele, a paginação pelo cursor e as respostas no pio e na aba do perfil.
- **Busca:** pelo começo do @ ou parte do nome, sem contas suspensas, com o termo tratado como texto (e não como expressão regular).
- **Proteções:** cabeçalhos do helmet, limite de complexidade, e a API em modo produção sem introspecção nem GraphiQL.

## Arquitetura

### API

Cada assunto é um módulo do Nest (`auth`, `users`, `tweets`, `likes`, `follows`, `feed`), e cada módulo tem as mesmas quatro camadas:

```
modules/tweets/
  domain/          regras e contratos: a entidade e o repositório abstrato
  application/     casos de uso (services); não sabem que existe Mongo nem GraphQL
  infrastructure/  implementação com Mongoose (schema e repositório)
  presentation/    resolvers GraphQL, DTOs com validação e guards
  testing/         repositório em memória, usado nos testes unitários
```

O service depende do repositório **abstrato**. É o módulo que decide qual implementação entra: a do Mongo em produção, a em memória nos testes.

Os módulos conversam entre si por eventos. Por exemplo, quando um pio é apagado, o módulo de curtidas apaga as curtidas dele, sem que `tweets` precise conhecer `likes`.

#### Autenticação e permissões

Três guards globais rodam em toda operação, nesta ordem:

1. **`GqlThrottlerGuard`** aplica o rate limit (detalhes abaixo).
2. **`GqlAuthGuard`** exige um JWT válido. Só o que tem `@Public()` (cadastro, login, renovar sessão, logout) passa sem token.
3. **`RolesGuard`** confere o papel quando a operação tem `@Roles(...)`. Por exemplo, só ADMIN suspende ou reativa contas.

Já o `TweetOwnerGuard` é usado só no `deleteTweet`: deixa apagar quem é dono do pio, MODERATOR ou ADMIN.

Sobre a sessão:

- **Access token:** é um JWT que vale 15 minutos.
- **Refresh token:** é um valor aleatório que vale 7 dias e é guardado no banco só como hash. Uma sessão dura no máximo 30 dias desde o login.
- **Rotação:** a cada renovação, o refresh token antigo morre.
- **Reuso:** se um token já usado aparecer de novo, a API trata como roubo e encerra todas as sessões da conta.

#### Proteções

**Rate limit** (`@nestjs/throttler`): é contado por IP e por operação, numa janela de 1 minuto. Quem passa do limite recebe o erro `TOO_MANY_REQUESTS`.

| Operação | Limite por minuto |
|---|---|
| `login`, `signup` | 5 |
| `refreshSession` | 10 |
| `createTweet` | 30 |
| `toggleLike` | 60 |
| Demais | 100 |

**Limite de complexidade:** antes de executar, a API calcula o custo da consulta. Cada campo custa 1, e uma lista custa o custo de um item vezes o `limit`. Acima de 2.000, a consulta é recusada com `QUERY_TOO_COMPLEX` antes de chegar ao banco.

**Helmet:** cabeçalhos de segurança HTTP em toda resposta.

**CORS:** só o endereço do front (`CORS_ORIGIN`) pode chamar a API pelo navegador.

**Produção** (`NODE_ENV=production`):

- **Mapa da API escondido:** a introspecção fica desligada, o GraphiQL também, e os erros não sugerem nomes de campos ("Did you mean...?").
- **Erros internos:** chegam ao cliente como uma mensagem genérica.

**Validação:** todo input passa pelo `class-validator`, e campos desconhecidos são descartados.

**Login:** senhas com argon2. O login leva o mesmo tempo para um e-mail que existe e para um que não existe, para não revelar quem tem conta.

> O rate limit guarda a contagem na memória do processo. Com mais de uma instância da API, seria preciso um armazenamento compartilhado (Redis). Atrás de um proxy (Render, Nginx...), é preciso configurar o `trust proxy` do Express para o IP real chegar à API.

### Front

```
web/src/
  apollo/      cliente Apollo: anexa o token e renova a sessão quando ele vence
  features/    uma pasta por área (auth, tweets, profile, search, admin),
               cada uma com as telas, os hooks e as operações .graphql
  components/  peças compartilhadas (avatar, modais, menu da conta...)
  gql/         tipos gerados pelo codegen (não editar à mão)
```

Os tipos das operações são gerados a partir do schema da API. Depois de mudar o `api/schema.gql` ou um `.graphql` do front, rode `npm run codegen` em `web/`.

A curtida é otimista: o número muda na hora e volta sozinho se a API recusar.

Quando o access token vence, o front renova a sessão uma vez e repete a operação. Várias operações que falham juntas esperam a mesma renovação.
