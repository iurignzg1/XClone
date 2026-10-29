# Pio

Um clone do X (antigo Twitter), feito como case de estágio: publicar pios, responder, curtir, seguir pessoas, ver um feed com quem você segue e receber notificações. Quem não tem conta (visitante) lê a página inicial, os pios e os perfis, e qualquer interação pede login.

| Pasta | O que é | Stack |
|---|---|---|
| [`api/`](api) | API GraphQL | NestJS 12, GraphQL code-first (Apollo), MongoDB (Mongoose), JWT |
| [`web/`](web) | Front-end | React 19, Vite, Apollo Client 4, Zustand, React Router, CSS Modules |

## O que dá para fazer

- **Conta e sessão:** cadastro, login, renovação automática da sessão e sair (deste aparelho ou de todos).
- **Pios:** publicar (até 280 caracteres), responder, apagar, e ver o pio com as respostas.
- **Curtidas:** curtir com resposta imediata na tela (otimista) e ver quem curtiu.
- **Seguir:** seguir e deixar de seguir, listas de seguidores e de seguindo, e o bloco "Quem seguir".
- **Feed:** os pios seus e de quem você segue, com paginação ("Carregar mais").
- **Perfil:** capa (10 opções), bio, nome de exibição e abas Pios, Respostas e Curtidas.
- **Pesquisa:** pessoas pelo @ ou pelo nome.
- **Notificações:** curtidas (agrupadas por pio), respostas e novos seguidores, com o número no menu.
- **Visitante:** a home "Em alta" (os pios mais curtidos), pios e perfis abertos.
- **Moderação:** MODERATOR apaga pios de qualquer pessoa; ADMIN também suspende e reativa contas.
- **Tema claro e escuro.**

### Quem pode o quê

| Ação | Visitante | Usuário | Moderador | Admin |
|---|:-:|:-:|:-:|:-:|
| Ler a home pública, os pios e os perfis | sim | sim | sim | sim |
| Publicar, responder, curtir, seguir | não | sim | sim | sim |
| Pesquisar, notificações, feed, listas de seguidores | não | sim | sim | sim |
| Editar o próprio perfil | não | sim | sim | sim |
| Apagar o pio de outra pessoa | não | não | sim | sim |
| Suspender e reativar contas (página Admin) | não | não | não | sim |

## Como rodar

### O que você precisa

- **Node.js 24** ou mais novo.
- **Um MongoDB.** Pode ser um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas) ou um Mongo local (`mongodb://localhost:27017/pio`). No Atlas, o seu IP precisa estar em **Network Access**.

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

### 2. Front

Em outro terminal:

```bash
cd web
npm install
npm run dev
```

Abra <http://localhost:5173>. O front procura a API em `http://localhost:3000/graphql`. Para usar outro endereço, copie `web/.env.example` para `web/.env` e defina `VITE_API_URL`.

### 3. Dados de demonstração (opcional)

Crie a sua conta pelo front e, na pasta `api/`, rode:

```bash
npm run seed -- --admin <seu_username>
```

O seed cria 20 contas, com pios, respostas, curtidas, seguidores e as notificações correspondentes, todas com a senha `pio-seed-123`. Com `--admin`, a sua conta vira ADMIN e passa a seguir, e ser seguida por, parte dessas contas. Sem `--admin`, só as 20 contas são criadas.

`npm run seed:limpar` apaga tudo o que o seed criou e deixa o resto do banco como estava. Para recriar, rode `seed:limpar` e depois `seed` de novo.

### Se algo der errado

| Sintoma | Causa provável |
|---|---|
| "Não consegui falar com a API" | A API não está rodando, ou o endereço do front não está no `CORS_ORIGIN`. |
| A API não sobe: "Could not connect to any servers" | Com o Atlas, o seu IP mudou. Adicione o IP atual em **Network Access**. |
| `Cannot query field "..." on type "..."` | A API em execução está desatualizada em relação ao front. Reinicie a API (`npm run start:dev`). |
| A página de notificações abre vazia | O seed antigo não criava notificações. Rode `seed:limpar` e `seed` de novo. Ações novas já geram notificação sozinhas. |
| Tela em branco ou sem estilo depois de mudar de branch | Reinicie o `npm run dev` do front. |

## Testes e qualidade

| Comando | Onde | O que faz |
|---|---|---|
| `npm test` | `api/` | Testes unitários dos services, guards, DTOs e da formatação de erros (Jest) |
| `npm run test:e2e` | `api/` | Testes de ponta a ponta: sobe a API inteira e conversa com ela por HTTP |
| `npm test` | `web/` | Testes das telas e componentes (Vitest + Testing Library) |
| `npm run lint:check` / `npm run lint` | `api/` / `web/` | ESLint |
| `npm run typecheck` | `api/` e `web/` | Checagem de tipos do TypeScript |

Rode os dois testes da API: parte da cobertura só existe nos e2e.

Os testes e2e não precisam de banco nenhum, nem do `.env`. Eles sobem um MongoDB temporário na memória (`mongodb-memory-server`), que é apagado no fim. Na primeira vez, o pacote baixa o binário do MongoDB, uns 100 MB.

Os testes unitários ficam com as regras que dependem só do código: prazos e corridas da sessão, curtidas simultâneas, DataLoaders, guards, validação. Tudo o que depende das consultas no Mongo (ordem, filtros, cursor, índices) é testado nos e2e, com o banco de verdade. Um caso não é repetido nos dois.

O que os e2e cobrem:

- **Autenticação:** cadastro, login, senha errada, renovação de sessão (inclusive o reuso de um refresh token roubado), logout, conta suspensa e o rate limit do login.
- **Curtidas:** curtir e descurtir, contagem por pessoa, cliques simultâneos, pio inexistente e o que acontece ao apagar o pio.
- **Feed e respostas:** seguir alguém muda o feed, as respostas ficam fora dele, a paginação pelo cursor e as respostas no pio e na aba do perfil.
- **Visitante:** a página inicial com os pios mais curtidos, a leitura de pios e perfis sem login, contas suspensas fora da vista pública e das listas, e tudo o que exige login barrado (inclusive com token inválido).
- **Busca:** pelo começo do @ ou parte do nome, sem contas suspensas, com o termo tratado como texto (e não como expressão regular).
- **Notificações:** agrupamento das curtidas, ordem, nada para si mesmo, desfazer sem spam, marcar como lidas e pio apagado.
- **Proteções:** cabeçalhos do helmet, limite de complexidade, e a API em modo produção sem introspecção nem GraphiQL.

## Arquitetura

### API

Cada assunto é um módulo do Nest (`auth`, `users`, `tweets`, `likes`, `follows`, `feed`, `notifications`), e cada módulo tem as mesmas quatro camadas:

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

As notificações seguem o mesmo padrão. `likes`, `tweets` e `follows` só anunciam o que aconteceu ("curtiu", "respondeu", "começou a seguir"), e o módulo `notifications` escuta e grava. Algumas regras:

- **Curtidas agrupadas:** as do mesmo pio viram uma linha só ("Ana e mais 4 pessoas curtiram seu pio").
- **Sem aviso de si mesmo:** ninguém é avisado de curtir ou responder o próprio pio.
- **Desfazer apaga o aviso:** descurtir ou deixar de seguir apaga o aviso correspondente, então repetir a ação gera no máximo um. Deixar de seguir não avisa ninguém, de propósito.
- **Falha não atrapalha:** se gravar a notificação der erro, a ação original continua valendo.

#### Autenticação e permissões

Três guards globais rodam em toda operação, nesta ordem:

1. **`GqlThrottlerGuard`** aplica o rate limit (detalhes abaixo).
2. **`GqlAuthGuard`** exige um JWT válido, com duas exceções: `@Public()` (cadastro, login, renovar sessão, logout) passa sem token, e `@OptionalAuth()` (as leituras de visitante, abaixo) passa sem token mas confere o token quando ele vem.
3. **`RolesGuard`** confere o papel quando a operação tem `@Roles(...)`. Por exemplo, só ADMIN suspende ou reativa contas.

Já o `TweetOwnerGuard` é usado só no `deleteTweet`: deixa apagar quem é dono do pio, MODERATOR ou ADMIN.

Sobre a sessão:

- **Access token:** é um JWT que vale 15 minutos.
- **Refresh token:** é um valor aleatório que vale 7 dias e é guardado no banco só como hash. Uma sessão dura no máximo 30 dias desde o login.
- **Rotação:** a cada renovação, o refresh token antigo morre.
- **Reuso:** se um token já usado aparecer de novo, a API trata como roubo e encerra todas as sessões da conta.

#### Visitantes (sem login)

Por padrão, tudo exige login. As leituras públicas ganham `@OptionalAuth()`: sem token, passam como visitante; com token, o token é conferido como sempre, então um token vencido continua dando `UNAUTHENTICATED` (é o que faz o front renovar a sessão). São abertas: `topTweets` (os pios mais curtidos, a página inicial), `tweet`, `userTweets`, `userReplies` e `userByUsername`.

- **O que visitante não faz:** publicar, curtir, seguir, ver notificações, pesquisar, ver as listas de seguidores e de quem curtiu, e as curtidas de um perfil (como no X, elas são privadas).
- **Contas suspensas:** para o visitante, o perfil, os pios e as respostas delas somem (`NOT_FOUND`). Quem está logado continua vendo, porque o ADMIN precisa do perfil para reativar. As listas de seguidores, seguindo e de quem curtiu nunca mostram contas suspensas.
- **No front:** a home, o pio e o perfil abrem sem login. Curtir, seguir e ver listas abrem um aviso "Entre para...", e depois de entrar a pessoa volta para onde estava.

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

### Front

```
web/src/
  apollo/      cliente Apollo: anexa o token e renova a sessão quando ele vence
  features/    uma pasta por área (auth, tweets, profile, search, notifications,
               admin), cada uma com as telas, os hooks e as operações .graphql
  components/  peças compartilhadas (avatar, modais, menu da conta, aviso de login...)
  gql/         tipos gerados pelo codegen (não editar à mão)
```

Os tipos das operações são gerados a partir do schema da API. Depois de mudar o `api/schema.gql` ou um `.graphql` do front, rode `npm run codegen` em `web/`.

- **Curtida otimista:** o número muda na hora e volta sozinho se a API recusar.
- **Sessão:** quando o access token vence, o front renova a sessão uma vez e repete a operação. Várias operações que falham juntas esperam a mesma renovação.
- **Ações sérias:** apagar, sair e suspender pedem confirmação.

## Limitações conhecidas

- **Sem tempo real:** o número de notificações no menu é consultado a cada 30 segundos (polling), e o feed só se atualiza ao recarregar ou clicar em "Atualizar". O próximo passo natural seriam subscriptions GraphQL com WebSocket.
- **Rate limit na memória do processo:** com mais de uma instância da API, seria preciso um armazenamento compartilhado (Redis). Atrás de um proxy (Render, Nginx...), é preciso configurar o `trust proxy` do Express para o IP real chegar à API.
- **Contadores e contas suspensas:** os números de seguidores e de curtidas ainda contam contas suspensas, embora as listas não as mostrem.
- **A home do visitante não pagina:** mostra os 20 pios mais curtidos.
- **Sem foto de perfil:** o avatar é a inicial do nome sobre uma cor fixa por pessoa.
