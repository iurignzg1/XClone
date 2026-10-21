import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { EnvironmentVariables } from '../../../config/env.validation.js';
import type { User } from '../../users/domain/user.entity.js';

export interface RefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, role: user.role });
  }

  // O refresh token é opaco (aleatório, não é JWT). No banco fica só o hash,
  // então um vazamento do banco não entrega tokens utilizáveis.
  generateRefreshToken(): RefreshToken {
    const token = randomBytes(48).toString('base64url');
    const ttlSeconds = this.config.getOrThrow('REFRESH_TOKEN_TTL_SECONDS', {
      infer: true,
    });
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  // SHA-256 (determinístico) porque precisamos buscar a sessão pelo hash.
  // Tokens aleatórios de 384 bits não precisam de hash lento como senhas.
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
