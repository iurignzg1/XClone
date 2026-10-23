import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { TokenService } from './application/token.service.js';
import { PasswordHasher } from './domain/password-hasher.js';
import { SessionRepository } from './domain/session.repository.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { JwtStrategy } from './infrastructure/jwt.strategy.js';
import { MongoSessionRepository } from './infrastructure/mongo-session.repository.js';
import {
  SessionModel,
  SessionSchema,
} from './infrastructure/session.schema.js';
import { AuthResolver } from './presentation/auth.resolver.js';
import { GqlAuthGuard } from './presentation/guards/gql-auth.guard.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.getOrThrow('ACCESS_TOKEN_TTL_SECONDS', {
            infer: true,
          }),
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: SessionModel.name, schema: SessionSchema },
    ]),
  ],
  providers: [
    AuthService,
    TokenService,
    AuthResolver,
    JwtStrategy,
    { provide: SessionRepository, useClass: MongoSessionRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    // A ordem importa: primeiro autentica, depois confere o papel.
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
