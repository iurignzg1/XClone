// Popula o banco com dados de demonstração: 20 pessoas, pios ao longo dos
// últimos 10 dias, respostas, curtidas e vínculos de seguir.
//
//   npm run seed                      cria os dados
//   npm run seed -- --admin iuri      cria e torna @iuri ADMIN (que passa a
//                                     seguir 8 pessoas e ganha 12 seguidores)
//   npm run seed:limpar               apaga tudo o que o seed criou
//
// As contas criadas têm e-mail @pio.seed (é assim que o --limpar as acha) e
// senha "pio-seed-123". O sorteio usa uma semente fixa: rodar de novo, depois
// de limpar, gera os mesmos dados.
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';

const SEED_DOMAIN = '@pio.seed';
const PASSWORD = 'pio-seed-123';
const DAY = 24 * 60 * 60 * 1000;
const { ObjectId } = mongoose.Types;

const PEOPLE = [
  ['marina_costa', 'Marina Costa', 'Designer de produto. Café, tipografia e bicicleta.'],
  ['rafa_lima', 'Rafael Lima', 'Back-end de dia, violão de noite.'],
  ['julia_n', 'Júlia Nogueira', 'Estudante de computação na UFMG.'],
  ['pedro_alves', 'Pedro Alves', 'Corredor amador e fã de dados.'],
  ['bia_souza', 'Beatriz Souza', 'Fotografia analógica e plantas.'],
  ['lucas_dev', 'Lucas Ferreira', 'TypeScript em tudo que dá.'],
  ['camila_r', 'Camila Rocha', 'PM. Escrevo sobre produto e times.'],
  ['thiago_m', 'Thiago Mendes', 'DevOps, Linux e muito terminal.'],
  ['lari_santos', 'Larissa Santos', 'Ilustradora. Gatos e aquarela.'],
  ['gui_oliveira', 'Guilherme Oliveira', 'Engenheiro de dados. Futebol aos domingos.'],
  ['fer_castro', 'Fernanda Castro', 'QA e caçadora de bugs.'],
  ['joao_pedro', 'João Pedro', 'Mobile dev. React Native e Kotlin.'],
  ['nat_ribeiro', 'Natália Ribeiro', 'Pesquisa em UX e acessibilidade.'],
  ['vini_araujo', 'Vinícius Araújo', 'Segurança da informação.'],
  ['isa_barros', 'Isabela Barros', 'Front-end e animações na web.'],
  ['diego_cardoso', 'Diego Cardoso', 'Professor de matemática e nerd de xadrez.'],
  ['manu_pires', 'Manuela Pires', 'Viagens, trilhas e mapas.'],
  ['caio_teixeira', 'Caio Teixeira', 'Arquiteto de software. Opiniões fortes.'],
  ['leticia_g', 'Letícia Gomes', 'Cientista de dados. Python e chá.'],
  ['andre_moura', 'André Moura', 'Músico e programador nas horas vagas.'],
];

const COVERS = ['grafite', 'sol', 'vidro', 'bauhaus', 'grade', 'topografia', 'riscas', 'meio-tom', 'xadrez', 'granito'];

const POSTS = [
  'Primeiro café do dia e o build já quebrou. Começamos bem.',
  'Alguém mais acha que nomear variável é a parte mais difícil da programação?',
  'Terminei o livro de arquitetura limpa. Recomendo, mas com moderação.',
  'Hoje aprendi que o DataLoader junta as consultas por requisição. Mudou meu dia.',
  'Chuva em BH e eu sem guarda-chuva, de novo.',
  'Refatorei uma função de 300 linhas em 5 de 40. Satisfação pura.',
  'Dica: escrevam testes antes de mexer no código legado. Obrigado, de nada.',
  'Domingo é dia de feira e de não abrir o Slack.',
  'O melhor commit é o que apaga código.',
  'Alguém tem indicação de teclado mecânico silencioso?',
  'Pair programming hoje rendeu mais que a semana inteira sozinho.',
  'GraphQL ou REST? Depende. Sempre depende.',
  'Fui correr 10 km e voltei com uma ideia de projeto. Vale?',
  'Tema escuro em tudo, até no micro-ondas se desse.',
  'Revisão de código não é sobre o código ser seu. É sobre ele ser bom.',
  'Hoje foi dia de reunião que podia ser um e-mail.',
  'Aprendendo NestJS e gostando bastante dos módulos.',
  'Quem nunca deu deploy na sexta que atire o primeiro commit.',
  'Fotografei o pôr do sol de hoje. Nenhum filtro faz justiça.',
  'Acessibilidade não é extra, é requisito.',
  'Meu gato sentou no teclado e o lint passou. Coincidência?',
  'Saudades de quando o node_modules cabia no pendrive.',
  'Café coado > qualquer outro método. Aceito debates.',
  'Primeira vez usando Zustand. Simples demais, desconfio.',
  'Documentação boa é a que alguém lê. Escreva curto.',
  'Hoje o pull request foi aprovado sem nenhum comentário. Sonho ou realidade?',
  'Trilha no fim de semana: 14 km e muita lama.',
  'Optimistic UI deixa tudo com cara de mágica.',
  'Estudando para a prova de estruturas de dados. Me desejem sorte.',
  'Aquarela nova terminada: um farol no fim da tarde.',
  'Se o teste é difícil de escrever, o problema geralmente é o código.',
  'Xadrez de manhã, código à tarde. Equilíbrio.',
  'Descobri o atalho de selecionar a próxima ocorrência no editor. Vida nova.',
  'O segredo do bom pão é paciência. Do bom software também.',
  'Monitoramento salvou a madrugada hoje. Alerta certo, na hora certa.',
  'Hoje é dia de limpar as branches antigas do repositório.',
  'Minha playlist de foco tem 3 músicas em loop há 2 anos.',
  'Qual o melhor jeito de aprender TypeScript? Usando em projeto real.',
  'Viagem marcada: Chapada Diamantina em novembro.',
  'Bug resolvido depois de 4 horas: era um espaço no .env.',
];

const REPLIES = [
  'Concordo demais!',
  'Isso aconteceu comigo ontem, kkkk',
  'Boa! Me manda o link depois?',
  'Discordo um pouco, mas faz sentido.',
  'Salvando para ler com calma.',
  'Que demais, parabéns!',
  'Passei pela mesma coisa semana passada.',
  'Isso merecia virar um post no blog.',
  'Verdade. Ninguém fala disso.',
  'Hahaha, clássico.',
  'Me ensina?',
  'Exatamente o que eu precisava ler hoje.',
];

// Sorteio com semente fixa (mulberry32): mesmos dados a cada execução.
let state = 42;
function random() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
function sample(list, count) {
  const copy = [...list];
  const out = [];
  while (out.length < count && copy.length) out.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  return out;
}

// O feed ordena pelo _id, que carrega a data de criação: o _id de cada
// documento é gerado com a data sorteada, para a ordem bater com createdAt.
function idAt(date) {
  const seconds = Math.floor(date.getTime() / 1000).toString(16).padStart(8, '0');
  const rest = Array.from({ length: 16 }, () => Math.floor(random() * 16).toString(16)).join('');
  return new ObjectId(seconds + rest);
}

function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const match = env.match(/^MONGODB_URI\s*=\s*(.*)$/m);
  if (!match) throw new Error('MONGODB_URI não encontrada no .env');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

async function clean(db) {
  const users = await db.collection('users').find({ email: { $regex: `${SEED_DOMAIN.replace('.', '\\.')}$` } }).toArray();
  const ids = users.map((u) => u._id);
  const tweets = await db.collection('tweets').find({ authorId: { $in: ids } }).toArray();
  const tweetIds = tweets.map((t) => t._id);
  // Curtidas das contas do seed em pios que ficam (os de pessoas reais):
  // desconta do contador antes de apagar.
  const likesOnKept = await db
    .collection('likes')
    .aggregate([
      { $match: { userId: { $in: ids }, tweetId: { $nin: tweetIds } } },
      { $group: { _id: '$tweetId', total: { $sum: 1 } } },
    ])
    .toArray();
  for (const { _id, total } of likesOnKept) {
    await db.collection('tweets').updateOne({ _id }, { $inc: { likesCount: -total } });
  }
  const removed = {
    curtidas: (await db.collection('likes').deleteMany({ $or: [{ userId: { $in: ids } }, { tweetId: { $in: tweetIds } }] })).deletedCount,
    vinculos: (await db.collection('follows').deleteMany({ $or: [{ followerId: { $in: ids } }, { followingId: { $in: ids } }] })).deletedCount,
    notificacoes: (await db.collection('notifications').deleteMany({ $or: [{ actorId: { $in: ids } }, { recipientId: { $in: ids } }] })).deletedCount,
    pios: (await db.collection('tweets').deleteMany({ _id: { $in: tweetIds } })).deletedCount,
    sessoes: (await db.collection('sessions').deleteMany({ userId: { $in: ids } })).deletedCount,
    pessoas: (await db.collection('users').deleteMany({ _id: { $in: ids } })).deletedCount,
  };
  console.log('Seed removido:', removed);
}

async function seed(db, adminUsername) {
  const already = await db.collection('users').countDocuments({ email: { $regex: `${SEED_DOMAIN.replace('.', '\\.')}$` } });
  if (already > 0) {
    console.log(`Já existem ${already} contas do seed. Rode "npm run seed:limpar" antes de criar de novo.`);
    return;
  }

  let admin = null;
  if (adminUsername) {
    admin = await db.collection('users').findOne({ username: adminUsername.toLowerCase() });
    if (!admin) throw new Error(`Usuário @${adminUsername} não encontrado`);
  }

  const now = Date.now();
  const passwordHash = await argon2.hash(PASSWORD);

  // Pessoas, criadas entre 30 e 60 dias atrás.
  const users = PEOPLE.map(([username, displayName, bio], index) => {
    const createdAt = new Date(now - between(30, 60) * DAY);
    return {
      _id: idAt(createdAt),
      username,
      email: `${username}${SEED_DOMAIN}`,
      passwordHash,
      role: 'USER',
      displayName,
      bio,
      cover: COVERS[index % COVERS.length],
      suspended: false,
      createdAt,
    };
  });
  await db.collection('users').insertMany(users);
  const people = users.map((u) => u._id);

  // Pios: de 2 a 4 por pessoa, nos últimos 10 dias.
  const tweets = [];
  const posts = sample(POSTS, POSTS.length);
  for (const user of users) {
    for (let i = 0; i < between(2, 4); i++) {
      const createdAt = new Date(now - random() * 10 * DAY);
      tweets.push({ _id: idAt(createdAt), content: posts.length ? posts.pop() : pick(POSTS), authorId: user._id, parentId: null, likesCount: 0, createdAt });
    }
  }

  // Respostas: a pios do seed e aos pios de topo de quem já está no banco.
  const realTopLevel = await db.collection('tweets').find({ parentId: null, authorId: { $nin: people } }).toArray();
  const replyTargets = [...tweets, ...realTopLevel];
  for (let i = 0; i < 18; i++) {
    const parent = pick(replyTargets);
    const author = pick(users.filter((u) => !u._id.equals(parent.authorId)));
    const createdAt = new Date(Math.min(now, parent.createdAt.getTime() + random() * 2 * DAY));
    tweets.push({ _id: idAt(createdAt), content: pick(REPLIES), authorId: author._id, parentId: parent._id, likesCount: 0, createdAt });
  }

  // Curtidas: cada pio do seed ganha de 0 a 8; os pios reais, de 3 a 9.
  const likes = [];
  const realLikes = new Map();
  const like = (tweet, count) => {
    for (const userId of sample(people.filter((id) => !id.equals(tweet.authorId)), count)) {
      const createdAt = new Date(Math.min(now, tweet.createdAt.getTime() + random() * DAY));
      likes.push({ _id: idAt(createdAt), userId, tweetId: tweet._id, createdAt });
    }
  };
  for (const tweet of tweets) {
    const count = Math.floor(random() ** 2 * 9);
    like(tweet, count);
    tweet.likesCount = count;
  }
  for (const tweet of realTopLevel) {
    const count = between(3, 9);
    like(tweet, count);
    realLikes.set(tweet._id, count);
  }

  await db.collection('tweets').insertMany(tweets);
  await db.collection('likes').insertMany(likes);
  for (const [_id, count] of realLikes) {
    await db.collection('tweets').updateOne({ _id }, { $inc: { likesCount: count } });
  }

  // Seguir: cada pessoa segue de 3 a 7 outras; o admin segue 8 e ganha 12 seguidores.
  const follows = [];
  const follow = (followerId, followingId) => {
    const createdAt = new Date(now - random() * 20 * DAY);
    follows.push({ _id: idAt(createdAt), followerId, followingId, createdAt });
  };
  for (const user of users) {
    for (const other of sample(people.filter((id) => !id.equals(user._id)), between(3, 7))) follow(user._id, other);
  }
  if (admin) {
    for (const id of sample(people, 8)) follow(admin._id, id);
    for (const id of sample(people, 12)) follow(id, admin._id);
    await db.collection('users').updateOne({ _id: admin._id }, { $set: { role: 'ADMIN' } });
  }
  await db.collection('follows').insertMany(follows);

  // Notificações: o seed grava direto no banco, sem passar pela API, então os
  // eventos que geram as notificações não acontecem. Criamos aqui as mesmas
  // que a API teria criado (já como não lidas).
  const authorOf = new Map([...tweets, ...realTopLevel].map((t) => [t._id.toString(), t.authorId]));
  const notifications = [
    ...likes.map((l) => ({ type: 'LIKE', recipientId: authorOf.get(l.tweetId.toString()), actorId: l.userId, tweetId: l.tweetId, createdAt: l.createdAt })),
    ...tweets
      .filter((t) => t.parentId)
      .map((t) => ({ type: 'REPLY', recipientId: authorOf.get(t.parentId.toString()), actorId: t.authorId, tweetId: t._id, createdAt: t.createdAt })),
    ...follows.map((f) => ({ type: 'FOLLOW', recipientId: f.followingId, actorId: f.followerId, tweetId: null, createdAt: f.createdAt })),
  ]
    .filter((n) => !n.recipientId.equals(n.actorId))
    .map((n) => ({ ...n, readAt: null }));
  await db.collection('notifications').insertMany(notifications);

  console.log('Seed criado:', {
    pessoas: users.length,
    pios: tweets.filter((t) => !t.parentId).length,
    respostas: tweets.filter((t) => t.parentId).length,
    curtidas: likes.length,
    vinculos: follows.length,
    notificacoes: notifications.length,
    admin: admin ? `@${admin.username}` : 'nenhum (use --admin <usuario>)',
  });
  console.log(`Senha de todas as contas do seed: ${PASSWORD}`);
}

const args = process.argv.slice(2);
const adminIndex = args.indexOf('--admin');
await mongoose.connect(mongoUri(), { serverSelectionTimeoutMS: 15000 });
try {
  const db = mongoose.connection.db;
  if (args.includes('--limpar')) await clean(db);
  else await seed(db, adminIndex >= 0 ? args[adminIndex + 1] : null);
} finally {
  await mongoose.disconnect();
}
