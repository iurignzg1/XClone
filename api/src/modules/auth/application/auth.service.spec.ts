import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/application/users.service.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { InMemoryUserRepository } from '../../users/testing/in-memory-user.repository.js';
import { FakePasswordHasher } from '../testing/fake-password-hasher.js';
import { InMemorySessionRepository } from '../testing/in-memory-session.repository.js';

// Aqui ficam as regras da sessão que só dá para provar controlando o relógio e
// o repositório (prazos, corridas). Cadastro, login, logout e conta suspensa
// de ponta a ponta estão em test/auth.e2e-spec.ts.

const signupData = {
  username: 'iuri',
  email: 'iuri@example.com',
  password: 'senha-forte-123',
  displayName: 'Iuri',
};

const DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * DAY;
const THIRTY_DAYS = 30 * DAY;

// Diferença em ms entre a data e "agora + offset" (os testes rodam em ms, então
// uma folga de alguns segundos basta).
const distanceFrom = (date: Date, offset: number) =>
  Math.abs(date.getTime() - (Date.now() + offset));

describe('AuthService', () => {
  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let service: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    const config = new ConfigService({
      REFRESH_TOKEN_TTL_SECONDS: SEVEN_DAYS / 1000,
      SESSION_MAX_LIFETIME_SECONDS: THIRTY_DAYS / 1000,
    });
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
    it('guarda só hashes: nem a senha nem o refresh token ficam em texto puro', async () => {
      const result = await service.signup(signupData, 'jest');

      expect(users.users[0].passwordHash).toBe('hashed:senha-forte-123');
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

  describe('refreshSession', () => {
    it('cada sessão vale 7 dias a partir de agora: no login e a cada renovação (janela deslizante)', async () => {
      const first = await service.signup(signupData, 'jest');
      expect(
        distanceFrom(sessions.sessions[0].expiresAt, SEVEN_DAYS),
      ).toBeLessThan(5000);
      // Simula uma sessão aberta há 6 dias, que venceria amanhã.
      sessions.sessions[0].loginAt = new Date(Date.now() - 6 * DAY);
      sessions.sessions[0].expiresAt = new Date(Date.now() + DAY);

      await service.refreshSession(first.refreshToken, 'jest');

      expect(
        distanceFrom(sessions.sessions[1].expiresAt, SEVEN_DAYS),
      ).toBeLessThan(5000);
    });

    it('o teto de 30 dias desde o login vale para toda a cadeia de renovações', async () => {
      const first = await service.signup(signupData, 'jest');
      // Simula um login de 29 dias atrás: só resta 1 dia até o teto.
      const loginAt = new Date(Date.now() - 29 * DAY);
      sessions.sessions[0].loginAt = loginAt;

      // Duas renovações: a segunda só respeita o teto se a primeira tiver
      // levado a data do login adiante.
      const second = await service.refreshSession(first.refreshToken, 'jest');
      await service.refreshSession(second.refreshToken, 'jest');

      const cap = new Date(loginAt.getTime() + THIRTY_DAYS);
      expect(sessions.sessions.map((s) => s.loginAt)).toEqual([
        loginAt,
        loginAt,
        loginAt,
      ]);
      expect(sessions.sessions[1].expiresAt).toEqual(cap);
      expect(sessions.sessions[2].expiresAt).toEqual(cap);
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

      await service.logout(a.refreshToken);

      expect(sessions.sessions[0].revokedAt).not.toBeNull();
      expect(sessions.sessions[1].revokedAt).toBeNull();
    });

    it('token desconhecido não dá erro', async () => {
      await expect(service.logout('token-inventado')).resolves.toBeUndefined();
    });

    it('logoutAll revoga todas as sessões do usuário', async () => {
      await service.signup(signupData, 'jest');
      await service.login(signupData.email, signupData.password, 'celular');

      await service.logoutAll('user-1');

      expect(sessions.sessions.every((s) => s.revokedAt !== null)).toBe(true);
    });
  });
});
