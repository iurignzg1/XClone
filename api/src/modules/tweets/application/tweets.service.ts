import { Injectable, NotFoundException } from '@nestjs/common';
import DataLoader from 'dataloader';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../../users/application/users.service.js';
import {
  REPLY_CREATED,
  type ReplyCreatedEvent,
} from '../domain/reply-created.event.js';
import {
  TWEET_DELETED,
  type TweetDeletedEvent,
} from '../domain/tweet-deleted.event.js';
import type { Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';

export const REPLIES_LIMIT = 50;

// Quantas contas suspensas o service procura para tirá-las da página pública.
const SUSPENDED_LOOKUP_LIMIT = 1000;

export interface CreateTweetData {
  authorId: string;
  content: string;
  parentId?: string;
}

@Injectable()
export class TweetsService {
  constructor(
    private readonly tweetRepository: TweetRepository,
    private readonly usersService: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  async create(data: CreateTweetData): Promise<Tweet> {
    // Uma resposta só faz sentido se o tweet respondido existir.
    const parent = data.parentId
      ? await this.tweetRepository.findById(data.parentId)
      : null;
    if (data.parentId && !parent) {
      throw new NotFoundException('Tweet respondido não encontrado');
    }
    const tweet = await this.tweetRepository.create(data);
    if (parent) {
      const event: ReplyCreatedEvent = {
        replyId: tweet.id,
        authorId: tweet.authorId,
        parentAuthorId: parent.authorId,
      };
      await this.events.emitAsync(REPLY_CREATED, event);
    }
    return tweet;
  }

  async findById(id: string): Promise<Tweet> {
    const tweet = await this.tweetRepository.findById(id);
    if (!tweet) {
      throw new NotFoundException('Pio não encontrado');
    }
    return tweet;
  }

  // Página inicial dos visitantes: os pios mais curtidos, sem os de contas
  // suspensas.
  async findMostLiked(limit: number): Promise<Tweet[]> {
    const suspended = await this.usersService.listSuspended(
      SUSPENDED_LOOKUP_LIMIT,
    );
    return this.tweetRepository.findMostLiked(
      limit,
      suspended.map((user) => user.id),
    );
  }

  // Visitantes não veem o que contas suspensas escreveram: o pio some, como se
  // não existisse.
  async assertAuthorActive(tweet: Tweet): Promise<void> {
    const author = await this.usersService.findById(tweet.authorId);
    if (!author || author.suspended) {
      throw new NotFoundException('Pio não encontrado');
    }
  }

  async withoutSuspendedAuthors(tweets: Tweet[]): Promise<Tweet[]> {
    const authors = await this.usersService.findByIds([
      ...new Set(tweets.map((tweet) => tweet.authorId)),
    ]);
    const active = new Set(
      authors.filter((author) => !author.suspended).map((author) => author.id),
    );
    return tweets.filter((tweet) => active.has(tweet.authorId));
  }

  // Aba "Tweets" do perfil: só tweets de topo do usuário, do mais novo para o
  // mais antigo (as respostas ficam no detalhe de cada tweet, como no feed).
  async findByUsername(username: string, limit: number): Promise<Tweet[]> {
    const user = await this.usersService.getByUsername(username);
    return this.tweetRepository.findByAuthors([user.id], limit);
  }

  // Um loader por requisição: junta as contagens de respostas de todos os
  // tweets da mesma resposta numa única consulta (sem N+1).
  createRepliesCountLoader(): DataLoader<string, number> {
    return new DataLoader<string, number>(async (tweetIds) => {
      const totals = await this.tweetRepository.countReplies([...tweetIds]);
      return tweetIds.map((id) => totals.get(id) ?? 0);
    });
  }

  // Um loader por requisição para buscar pios pelo id (ex.: o pio de cada
  // notificação) numa consulta só. Pio apagado vira null.
  createByIdLoader(): DataLoader<string, Tweet | null> {
    return new DataLoader<string, Tweet | null>(async (ids) => {
      const tweets = await this.tweetRepository.findByIds([...ids]);
      const byId = new Map(tweets.map((tweet) => [tweet.id, tweet]));
      return ids.map((id) => byId.get(id) ?? null);
    });
  }

  // Aba "Respostas" do perfil: o que o usuário respondeu, do mais novo ao mais antigo.
  async findRepliesByUsername(
    username: string,
    limit: number,
  ): Promise<Tweet[]> {
    const user = await this.usersService.getByUsername(username);
    return this.tweetRepository.findRepliesByAuthor(user.id, limit);
  }

  // Vários tweets pelos ids, na mesma ordem dos ids (os que não existem somem).
  async findByIdsInOrder(ids: string[]): Promise<Tweet[]> {
    const tweets = await this.tweetRepository.findByIds(ids);
    const byId = new Map(tweets.map((tweet) => [tweet.id, tweet]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  findReplies(tweetId: string): Promise<Tweet[]> {
    return this.tweetRepository.findReplies(tweetId, REPLIES_LIMIT);
  }

  // A autorização (autor ou moderador) é checada antes, pelo TweetOwnerGuard.
  // Depois de apagar, anuncia o evento para os módulos que guardam dados do
  // tweet (as curtidas) limparem a parte deles. O emitAsync espera essa limpeza
  // terminar antes de a mutation responder.
  async delete(tweetId: string): Promise<void> {
    const deleted = await this.tweetRepository.deleteById(tweetId);
    if (deleted) {
      const event: TweetDeletedEvent = { tweetId };
      await this.events.emitAsync(TWEET_DELETED, event);
    }
  }

  findByAuthors(
    authorIds: string[],
    limit: number,
    after?: string,
  ): Promise<Tweet[]> {
    return this.tweetRepository.findByAuthors(authorIds, limit, after);
  }

  addLikes(tweetId: string, delta: number): Promise<Tweet | null> {
    return this.tweetRepository.addLikes(tweetId, delta);
  }
}
