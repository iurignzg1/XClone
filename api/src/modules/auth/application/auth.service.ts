import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserConflictError } from '../../users/domain/user-conflict.error.js';
import type { User } from '../../users/domain/user.entity.js';
import { UsersService } from '../../users/application/users.service.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { SessionRepository } from '../domain/session.repository.js';
import { TokenService } from './token.service.js';

export interface SignupData {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const INVALID_CREDENTIALS = 'Credenciais inválidas';

@Injectable()
export class AuthService {
  // Hash falso usado quando o e-mail não existe, para o login levar o mesmo
  // tempo e não revelar quais e-mails estão cadastrados.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async signup(data: SignupData, userAgent: string): Promise<AuthResult> {
    const passwordHash = await this.passwordHasher.hash(data.password);
    try {
      const user = await this.usersService.create({
        username: data.username,
        email: data.email,
        displayName: data.displayName,
        passwordHash,
      });
      return this.startSession(user, userAgent);
    } catch (error) {
      if (error instanceof UserConflictError) {
        throw new ConflictException(
          error.field === 'username'
            ? 'Nome de usuário já em uso'
            : 'E-mail já em uso',
        );
      }
      throw error;
    }
  }

  async login(
    email: string,
    password: string,
    userAgent: string,
  ): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await this.passwordHasher.verify(hash, password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (user.suspended) {
      throw new ForbiddenException('Conta suspensa');
    }
    return this.startSession(user, userAgent);
  }

  async refreshSession(
    refreshToken: string,
    userAgent: string,
  ): Promise<AuthResult> {
    const session = await this.sessionRepository.findByTokenHash(
      this.tokenService.hashRefreshToken(refreshToken),
    );
    if (!session) {
      throw new UnauthorizedException('Sessão inválida');
    }

    // Token já usado/revogado sendo apresentado de novo: alguém pode ter
    // roubado esse token. Derruba todas as sessões do usuário.
    if (session.revokedAt) {
      await this.sessionRepository.revokeAllByUser(session.userId);
      throw new UnauthorizedException('Sessão inválida');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    // Rotação: o token antigo morre antes de emitir o novo. Se duas
    // requisições chegarem juntas com o mesmo token, só uma consegue revogar;
    // a outra é tratada como reuso.
    const revoked = await this.sessionRepository.revoke(session.id);
    if (!revoked) {
      await this.sessionRepository.revokeAllByUser(session.userId);
      throw new UnauthorizedException('Sessão inválida');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || user.suspended) {
      throw new UnauthorizedException('Sessão inválida');
    }
    // A sessão nova continua a mesma "cadeia" de login: leva o loginAt da
    // anterior, para o teto contar desde o login original.
    return this.startSession(user, userAgent, session.loginAt);
  }

  // Basta o refresh token: quem tem o token já pode usar a sessão, então pode
  // encerrá-la, mesmo com o access token vencido. Idempotente: token
  // desconhecido ou já revogado não gera erro.
  async logout(refreshToken: string): Promise<void> {
    const session = await this.sessionRepository.findByTokenHash(
      this.tokenService.hashRefreshToken(refreshToken),
    );
    if (session) {
      await this.sessionRepository.revoke(session.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllByUser(userId);
  }

  // loginAt: no signup e no login é agora; no refresh vem da sessão anterior.
  private async startSession(
    user: User,
    userAgent: string,
    loginAt: Date = new Date(),
  ): Promise<AuthResult> {
    const refresh = this.tokenService.generateRefreshToken(loginAt);
    await this.sessionRepository.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      userAgent,
      loginAt,
    });
    const accessToken = await this.tokenService.signAccessToken(user);
    return { accessToken, refreshToken: refresh.token, user };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('dummy-password');
    return this.dummyHash;
  }
}
