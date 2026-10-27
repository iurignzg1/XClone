import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../users/domain/user-role.enum.js';
import type { User } from '../../../users/domain/user.entity.js';
import { TweetsService } from '../../application/tweets.service.js';
import type { Tweet } from '../../domain/tweet.entity.js';
import { TweetOwnerGuard } from './tweet-owner.guard.js';

const tweet = { id: 't1', authorId: 'autor' } as Tweet;

const fakeTweetsService = {
  findById: (id: string) =>
    id === tweet.id
      ? Promise.resolve(tweet)
      : Promise.reject(new NotFoundException('Pio não encontrado')),
} as unknown as TweetsService;

function contextFor(user: Partial<User>, tweetId: string) {
  const args = [{}, { input: { tweetId } }, { req: { user } }, {}];
  return {
    getHandler: () => () => undefined,
    getClass: () => TweetOwnerGuard,
    getType: () => 'graphql',
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
  } as unknown as ExecutionContext;
}

describe('TweetOwnerGuard', () => {
  const guard = new TweetOwnerGuard(fakeTweetsService);

  it('libera o autor do tweet', async () => {
    const context = contextFor({ id: 'autor', role: UserRole.USER }, 't1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('barra um usuário comum que não é o autor', async () => {
    const context = contextFor({ id: 'outro', role: UserRole.USER }, 't1');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('libera um moderador, mesmo não sendo o autor', async () => {
    const context = contextFor({ id: 'mod', role: UserRole.MODERATOR }, 't1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('libera um administrador, mesmo não sendo o autor', async () => {
    const context = contextFor({ id: 'adm', role: UserRole.ADMIN }, 't1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('devolve NotFound quando o tweet não existe', async () => {
    const context = contextFor(
      { id: 'autor', role: UserRole.USER },
      'nao-existe',
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
