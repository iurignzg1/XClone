import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { InMemoryUserRepository } from '../testing/in-memory-user.repository.js';

// Só a lógica do próprio service. Busca, capa padrão e suspensão, que dependem
// das consultas no Mongo, são testadas de verdade nos e2e (test/).

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

  function create(username: string) {
    return service.create({
      username,
      email: `${username}@example.com`,
      passwordHash: 'hash',
      displayName: username,
    });
  }

  it('getByUsername devolve o usuário pelo @, ou NotFound se ele não existe', async () => {
    const user = await service.getByUsername('iuri');

    expect(user.email).toBe('iuri@example.com');
    await expect(service.getByUsername('fantasma')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('a busca com termo só de espaços não busca nada (em vez de achar todo mundo)', async () => {
    expect(await service.search('   ', 10)).toEqual([]);
  });

  it('updateProfile recusa quando o usuário não existe', async () => {
    await expect(
      service.updateProfile('nao-existe', {
        displayName: 'Fulano',
        bio: '',
        cover: 'grafite',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('suspender e reativar', () => {
    it('não permite que o admin suspenda a própria conta', async () => {
      await expect(service.suspend('admin', 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('reativar tira a suspensão', async () => {
      const bia = await create('bia');
      await service.suspend('admin', bia.id);

      const result = await service.unsuspend(bia.id);

      expect(result.suspended).toBe(false);
    });

    it('suspender ou reativar quem não existe dá NotFound', async () => {
      await expect(service.suspend('admin', 'fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.unsuspend('fantasma')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createByIdLoader', () => {
    beforeEach(async () => {
      await create('maria');
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
