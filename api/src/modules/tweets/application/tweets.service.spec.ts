import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../../users/application/users.service.js';
import type { User } from '../../users/domain/user.entity.js';
import { TweetsService } from './tweets.service.js';
import { InMemoryTweetRepository } from '../testing/in-memory-tweet.repository.js';

// Só o método do UsersService que o TweetsService usa: "iuri" existe e é o u1.
const fakeUsersService = {
  getByUsername: (username: string) =>
    username === 'iuri'
      ? Promise.resolve({ id: 'u1', username } as User)
      : Promise.reject(new NotFoundException('Usuário não encontrado')),
} as unknown as UsersService;

describe('TweetsService', () => {
  let repository: InMemoryTweetRepository;
  let service: TweetsService;
  let emitted: { name: string; payload: unknown }[];

  beforeEach(() => {
    repository = new InMemoryTweetRepository();
    emitted = [];
    // Só o emitAsync do EventEmitter2, registrando o que foi anunciado.
    const events = {
      emitAsync: (name: string, payload: unknown) => {
        emitted.push({ name, payload });
        return Promise.resolve([]);
      },
    } as unknown as EventEmitter2;
    service = new TweetsService(repository, fakeUsersService, events);
  });

  describe('create', () => {
    it('cria um tweet comum, sem parentId e com 0 curtidas', async () => {
      const tweet = await service.create({ authorId: 'u1', content: 'olá' });

      expect(tweet.parentId).toBeNull();
      expect(tweet.likesCount).toBe(0);
      expect(tweet.authorId).toBe('u1');
    });

    it('cria uma resposta quando o tweet respondido existe', async () => {
      const original = await service.create({ authorId: 'u1', content: 'olá' });

      const reply = await service.create({
        authorId: 'u2',
        content: 'oi!',
        parentId: original.id,
      });

      expect(reply.parentId).toBe(original.id);
    });

    it('recusa resposta a um tweet que não existe', async () => {
      await expect(
        service.create({
          authorId: 'u1',
          content: 'oi',
          parentId: 'nao-existe',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.tweets).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('devolve o tweet quando ele existe', async () => {
      const created = await service.create({ authorId: 'u1', content: 'olá' });

      await expect(service.findById(created.id)).resolves.toEqual(created);
    });

    it('lança NotFound quando o tweet não existe', async () => {
      await expect(service.findById('nao-existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findReplies', () => {
    it('devolve só as respostas do tweet informado', async () => {
      const a = await service.create({ authorId: 'u1', content: 'a' });
      const b = await service.create({ authorId: 'u1', content: 'b' });
      const replyToA = await service.create({
        authorId: 'u2',
        content: 'resposta a A',
        parentId: a.id,
      });
      await service.create({
        authorId: 'u2',
        content: 'resposta a B',
        parentId: b.id,
      });

      const replies = await service.findReplies(a.id);

      expect(replies).toEqual([replyToA]);
    });
  });

  describe('createRepliesCountLoader', () => {
    it('conta as respostas de vários tweets numa consulta só', async () => {
      const a = await service.create({ authorId: 'u1', content: 'a' });
      const b = await service.create({ authorId: 'u1', content: 'b' });
      const c = await service.create({ authorId: 'u1', content: 'c' });
      for (const parentId of [a.id, a.id, b.id]) {
        await service.create({ authorId: 'u2', content: 'r', parentId });
      }
      const loader = service.createRepliesCountLoader();

      const totals = await Promise.all([
        loader.load(a.id),
        loader.load(b.id),
        loader.load(c.id),
      ]);

      expect(totals).toEqual([2, 1, 0]);
      expect(repository.countRepliesCalls).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('apaga o tweet', async () => {
      const created = await service.create({ authorId: 'u1', content: 'olá' });

      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('apagar um tweet que não existe não dá erro', async () => {
      await expect(service.delete('nao-existe')).resolves.toBeUndefined();
    });

    it('anuncia o evento tweet.deleted depois de apagar', async () => {
      const created = await service.create({ authorId: 'u1', content: 'olá' });

      await service.delete(created.id);

      expect(emitted).toEqual([
        { name: 'tweet.deleted', payload: { tweetId: created.id } },
      ]);
    });

    it('não anuncia nada quando o tweet não existia', async () => {
      await service.delete('nao-existe');

      expect(emitted).toEqual([]);
    });
  });

  describe('findByUsername', () => {
    it('devolve só os tweets de topo do usuário, do mais novo para o mais antigo', async () => {
      const primeiro = await service.create({ authorId: 'u1', content: '1' });
      await service.create({ authorId: 'u2', content: 'de outra pessoa' });
      const segundo = await service.create({ authorId: 'u1', content: '2' });
      await service.create({
        authorId: 'u1',
        content: 'resposta',
        parentId: primeiro.id,
      });

      const tweets = await service.findByUsername('iuri', 20);

      expect(tweets.map((t) => t.content)).toEqual([
        segundo.content,
        primeiro.content,
      ]);
    });

    it('respeita o limite', async () => {
      await service.create({ authorId: 'u1', content: '1' });
      await service.create({ authorId: 'u1', content: '2' });

      const tweets = await service.findByUsername('iuri', 1);

      expect(tweets.map((t) => t.content)).toEqual(['2']);
    });

    it('lança NotFound quando o usuário não existe', async () => {
      await expect(
        service.findByUsername('fantasma', 20),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
