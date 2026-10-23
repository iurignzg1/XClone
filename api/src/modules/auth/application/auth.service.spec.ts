import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/application/users.service.js';
import { UserConflictError } from '../../users/domain/user-conflict.error.js';
import { UserRole } from '../../users/domain/user-role.enum.js';
import type { NewUser, User } from '../../users/domain/user.entity.js';
import { UserRepository } from '../../users/domain/user.repository.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import type { NewSession, Session } from '../domain/session.entity.js';
import { SessionRepository } from '../domain/session.repository.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';

class InMemoryUserRepository extends UserRepository {
  users: User[] = [];

  create(data: NewUser): Promise<User> {
    const taken = this.users.find(
      (u) => u.username === data.username || u.email === data.email,
    );
    if (taken) {
      return Promise.reject(
        new UserConflictError(
          taken.email === data.email ? 'email' : 'username',
        ),
      );
    }
    const user: User = {
      ...data,
      id: `user-${this.users.length + 1}`,
      role: UserRole.USER,
      bio: '',
      suspended: false,
      createdAt: new Date(),
    };
    this.users.push(user);
    return Promise.resolve(user);
  }
  findById(id: string) {
    return Promise.resolve(this.users.find((u) => u.id === id) ?? null);
  }
  findByEmail(email: string) {
    return Promise.resolve(this.users.find((u) => u.email === email) ?? null);
  }
  setSuspended(id: string, suspended: boolean) {
    const user = this.users.find((u) => u.id === id);
    if (user) user.suspended = suspended;
    return Promise.resolve(user ?? null);
  }
  findByIds(ids: string[]) {
    return Promise.resolve(this.users.filter((u) => ids.includes(u.id)));
  }
  findByUsername(username: string) {
    return Promise.resolve(
      this.users.find((u) => u.username === username) ?? null,
    );
  }
}

class InMemorySessionRepository extends SessionRepository {
  sessions: Session[] = [];

  create(data: NewSession): Promise<Session> {
    const session: Session = {
      ...data,
      id: `session-${this.sessions.length + 1}`,
      revokedAt: null,
    };
    this.sessions.push(session);
    return Promise.resolve(session);
  }
  findByTokenHash(tokenHash: string) {
    return Promise.resolve(
      this.sessions.find((s) => s.tokenHash === tokenHash) ?? null,
    );
  }
  revoke(id: string) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session || session.revokedAt) return Promise.resolve(false);
    session.revokedAt = new Date();
    return Promise.resolve(true);
  }
  revokeAllByUser(userId: string) {
    for (const s of this.sessions) {
      if (s.userId === userId && !s.revokedAt) s.revokedAt = new Date();
    }
    return Promise.resolve();
  }
}

class FakePasswordHasher extends PasswordHasher {
  hash(plain: string) {
    return Promise.resolve(`hashed:${plain}`);
  }
  verify(hash: string, plain: string) {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

const signupData = {
  username: 'iuri',
  email: 'iuri@example.com',
  password: 'senha-forte-123',
  displayName: 'Iuri',
};

describe('AuthService', () => {
  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let service: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    const config = new ConfigService({ REFRESH_TOKEN_TTL_SECONDS: 604800 });
    const jwt = new JwtService({
      secret: 'x'.repeat(32),
      signOptions: { expiresIn: 900 },
    });
    service = new AuthService(
      new UsersService(users),
      sessions,
      new FakePasswordHasher(),
      new TokenService(jwt, config as never),
    );
  });

  describe('signup', () => {
    it('cria o usuário com a senha em hash e devolve o par de tokens', async () => {
      const result = await service.signup(signupData, 'jest');

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(users.users[0].passwordHash).toBe('hashed:senha-forte-123');
    });

    it('guarda só o hash do refresh token', async () => {
      const result = await service.signup(signupData, 'jest');

      expect(sessions.sessions).toHaveLength(1);
      expect(sessions.sessions[0].tokenHash).not.toBe(result.refreshToken);
      expect(sessions.sessions[0].tokenHash).toHaveLength(64);
    });

    it('rejeita username ou e-mail já em uso', async () => {
      await service.signup(signupData, 'jest');

      await expect(
        service.signup({ ...signupData, email: 'outro@example.com' }, 'jest'),
      ).rejects.toThrow(new ConflictException('Nome de usuário já em uso'));
      await expect(
        service.signup({ ...signupData, username: 'outro' }, 'jest'),
      ).rejects.toThrow(new ConflictException('E-mail já em uso'));
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.signup(signupData, 'jest');
    });

    it('autentica com as credenciais corretas', async () => {
      const result = await service.login(
        signupData.email,
        signupData.password,
        'jest',
      );

      expect(result.user.username).toBe('iuri');
      expect(sessions.sessions).toHaveLength(2);
    });

    it('usa a mesma mensagem para senha errada e e-mail inexistente', async () => {
      const wrongPassword = service.login(signupData.email, 'errada', 'jest');
      const unknownEmail = service.login('nao@existe.com', 'qualquer', 'jest');

      await expect(wrongPassword).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas'),
      );
      await expect(unknownEmail).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas'),
      );
    });

    it('bloqueia conta suspensa', async () => {
      users.users[0].suspended = true;

      await expect(
        service.login(signupData.email, signupData.password, 'jest'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('refreshSession', () => {
    it('troca o par de tokens e invalida o refresh token anterior', async () => {
      const first = await service.signup(signupData, 'jest');

      const second = await service.refreshSession(first.refreshToken, 'jest');

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(sessions.sessions[0].revokedAt).not.toBeNull();
      expect(sessions.sessions[1].revokedAt).toBeNull();
    });

    it('ao reusar um token já usado, derruba todas as sessões do usuário', async () => {
      const first = await service.signup(signupData, 'jest');
      const second = await service.refreshSession(first.refreshToken, 'jest');
      const otherDevice = await service.login(
        signupData.email,
        signupData.password,
        'celular',
      );

      await expect(
        service.refreshSession(first.refreshToken, 'jest'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessions.sessions.every((s) => s.revokedAt !== null)).toBe(true);
      await expect(
        service.refreshSession(second.refreshToken, 'jest'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.refreshSession(otherDevice.refreshToken, 'celular'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('com duas requisições simultâneas do mesmo token, só uma vence', async () => {
      const first = await service.signup(signupData, 'jest');

      const results = await Promise.allSettled([
        service.refreshSession(first.refreshToken, 'jest'),
        service.refreshSession(first.refreshToken, 'jest'),
      ]);

      const rejected = results.filter((r) => r.status === 'rejected');
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(UnauthorizedException);
      expect(sessions.sessions[0].revokedAt).not.toBeNull();
    });

    it('rejeita token desconhecido e token expirado', async () => {
      const first = await service.signup(signupData, 'jest');
      sessions.sessions[0].expiresAt = new Date(Date.now() - 1000);

      await expect(
        service.refreshSession('token-inventado', 'jest'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.refreshSession(first.refreshToken, 'jest'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('não renova sessão de conta suspensa', async () => {
      const first = await service.signup(signupData, 'jest');
      users.users[0].suspended = true;

      await expect(
        service.refreshSession(first.refreshToken, 'jest'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revoga só a sessão informada', async () => {
      const a = await service.signup(signupData, 'jest');
      await service.login(signupData.email, signupData.password, 'celular');

      await service.logout('user-1', a.refreshToken);

      expect(sessions.sessions[0].revokedAt).not.toBeNull();
      expect(sessions.sessions[1].revokedAt).toBeNull();
    });

    it('ignora token de outro usuário', async () => {
      const a = await service.signup(signupData, 'jest');

      await service.logout('outro-usuario', a.refreshToken);

      expect(sessions.sessions[0].revokedAt).toBeNull();
    });

    it('logoutAll revoga todas as sessões do usuário', async () => {
      await service.signup(signupData, 'jest');
      await service.login(signupData.email, signupData.password, 'celular');

      await service.logoutAll('user-1');

      expect(sessions.sessions.every((s) => s.revokedAt !== null)).toBe(true);
    });
  });
});
