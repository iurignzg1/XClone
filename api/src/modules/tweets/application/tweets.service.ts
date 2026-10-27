import { Injectable, NotFoundException } from '@nestjs/common';
import DataLoader from 'dataloader';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../../users/application/users.service.js';
import {
  TWEET_DELETED,
  type TweetDeletedEvent,
} from '../domain/tweet-deleted.event.js';
import type { Tweet } from '../domain/tweet.entity.js';
import { TweetRepository } from '../domain/tweet.repository.js';

const REPLIES_LIMIT = 50;

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
    if (data.parentId) {
      const parent = await this.tweetRepository.findById(data.parentId);
      if (!parent) {
        throw new NotFoundException('Tweet respondido não encontrado');
      }
    }
    return this.tweetRepository.create(data);
  }

  async findById(id: string): Promise<Tweet> {
    const tweet = await this.tweetRepository.findById(id);
    if (!tweet) {
      throw new NotFoundException('Pio não encontrado');
    }
    return tweet;
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
