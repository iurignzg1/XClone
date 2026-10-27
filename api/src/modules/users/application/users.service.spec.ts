import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { InMemoryUserRepository } from '../testing/in-memory-user.repository.js';

describe('UsersService', () => {
  let repository: InMemoryUserRepository;
  let service: UsersService;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    service = new UsersService(repository);
    await service.create({
      username: 'iuri',
      email: 'iuri@example.com',
      passwordHash: 'hash',
      displayName: 'Iuri',
    });
  });

  describe('getByUsername', () => {
    it('devolve o usuário quando ele existe', async () => {
      const user = await service.getByUsername('iuri');

      expect(user.email).toBe('iuri@example.com');
    });

    it('lança NotFound quando o usuário não existe', async () => {
      await expect(service.getByUsername('fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    async function seed() {
      for (const [username, displayName] of [
        ['ana', 'Ana Souza'],
        ['anabela', 'Bela'],
        ['bruno', 'Bruno Anacleto'],
        ['caio', 'Caio'],
      ]) {
        await service.create({
          username,
          email: `${username}@example.com`,
          passwordHash: 'hash',
          displayName,
        });
      }
    }

    it('acha pelo começo do @ e por parte do nome, sem diferenciar maiúsculas', async () => {
      await seed();

      const found = await service.search('ANA', 10);

      expect(found.map((u) => u.username)).toEqual(['ana', 'anabela', 'bruno']);
    });

    it('respeita o limite', async () => {
      await seed();

      expect(await service.search('ana', 2)).toHaveLength(2);
    });

    it('deixa contas suspensas de fora', async () => {
      await seed();
      const caio = repository.users.find((u) => u.username === 'caio');
      if (caio) caio.suspended = true;

      expect(await service.search('caio', 10)).toEqual([]);
    });

    it('termo só de espaços não busca nada', async () => {
      await seed();

      expect(await service.search('   ', 10)).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('troca o nome e a bio e devolve o usuário atualizado', async () => {
      const user = await service.create({
        username: 'ana',
        email: 'ana@example.com',
        passwordHash: 'hash',
        displayName: 'Ana',
      });

      const result = await service.updateProfile(user.id, {
        displayName: 'Ana Silva',
        bio: 'Gosto de pios curtos.',
        cover: 'sol',
      });

      expect(result.displayName).toBe('Ana Silva');
      expect(result.bio).toBe('Gosto de pios curtos.');
      expect(result.cover).toBe('sol');
      const saved = repository.users.find((u) => u.id === user.id);
      expect(saved?.displayName).toBe('Ana Silva');
      expect(saved?.bio).toBe('Gosto de pios curtos.');
      expect(saved?.username).toBe('ana');
      expect(saved?.email).toBe('ana@example.com');
    });

    it('uma bio vazia apaga a bio', async () => {
      const user = await service.create({
        username: 'ana',
        email: 'ana@example.com',
        passwordHash: 'hash',
        displayName: 'Ana',
      });
      await service.updateProfile(user.id, {
        displayName: 'Ana',
        bio: 'oi',
        cover: 'grafite',
      });

      const result = await service.updateProfile(user.id, {
        displayName: 'Ana',
        bio: '',
        cover: 'grafite',
      });

      expect(result.bio).toBe('');
    });

    it('conta nova começa com a capa padrão', async () => {
      const user = await service.create({
        username: 'novo',
        email: 'novo@example.com',
        passwordHash: 'hash',
        displayName: 'Novo',
      });

      expect(user.cover).toBe('grafite');
    });

    it('recusa quando o usuário não existe', async () => {
      await expect(
        service.updateProfile('nao-existe', {
          displayName: 'Fulano',
          bio: '',
          cover: 'grafite',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('suspend', () => {
    it('marca a conta como suspensa e devolve o usuário atualizado', async () => {
      const alvo = await service.create({
        username: 'alvo',
        email: 'alvo@example.com',
        passwordHash: 'hash',
        displayName: 'Alvo',
      });

      const result = await service.suspend('admin', alvo.id);

      expect(result.suspended).toBe(true);
      expect(repository.users.find((u) => u.id === alvo.id)?.suspended).toBe(
        true,
      );
    });

    it('não permite que o admin suspenda a própria conta', async () => {
      await expect(service.suspend('admin', 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lança NotFound quando o usuário não existe', async () => {
      await expect(service.suspend('admin', 'fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createByIdLoader', () => {
    beforeEach(async () => {
      await service.create({
        username: 'maria',
        email: 'maria@example.com',
        passwordHash: 'hash',
        displayName: 'Maria',
      });
    });

    it('junta várias buscas numa consulta só e devolve na ordem pedida', async () => {
      const loader = service.createByIdLoader();

      const users = await Promise.all([
        loader.load('user-2'),
        loader.load('user-1'),
        loader.load('user-2'),
      ]);

      expect(users.map((user) => user.username)).toEqual([
        'maria',
        'iuri',
        'maria',
      ]);
      expect(repository.findByIdsCalls).toEqual([['user-2', 'user-1']]);
    });

    it('rejeita um id que não existe, sem afetar os outros', async () => {
      const loader = service.createByIdLoader();

      const [found, missing] = await Promise.allSettled([
        loader.load('user-1'),
        loader.load('fantasma'),
      ]);

      expect(found.status).toBe('fulfilled');
      expect(missing.status).toBe('rejected');
      expect((missing as PromiseRejectedResult).reason).toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
