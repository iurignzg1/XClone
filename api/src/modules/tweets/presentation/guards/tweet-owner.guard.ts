import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { MODERATION_ROLES } from '../../../users/domain/user-role.enum.js';
import type { User } from '../../../users/domain/user.entity.js';
import { TweetsService } from '../../application/tweets.service.js';

// Para operações que recebem `input.tweetId`: só o autor do tweet passa.
// Moderadores e administradores também podem agir sobre tweets de outros.
@Injectable()
export class TweetOwnerGuard implements CanActivate {
  constructor(private readonly tweetsService: TweetsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext<{ req: { user: User } }>();
    const { input } = gqlContext.getArgs<{ input: { tweetId: string } }>();

    const tweet = await this.tweetsService.findById(input.tweetId);
    const isAuthor = tweet.authorId === req.user.id;
    if (!isAuthor && !MODERATION_ROLES.includes(req.user.role)) {
      throw new ForbiddenException('Você só pode apagar os seus próprios pios');
    }
    return true;
  }
}
