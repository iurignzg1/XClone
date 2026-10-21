import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { UserAgent } from '../../../common/decorators/user-agent.decorator.js';
import type { User } from '../../users/domain/user.entity.js';
import { AuthResult, AuthService } from '../application/auth.service.js';
import { LoginInput } from './dto/login.input.js';
import { RefreshTokenInput } from './dto/refresh-token.input.js';
import { SignupInput } from './dto/signup.input.js';
import { AuthPayload } from './types/auth-payload.type.js';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthPayload)
  signup(
    @Args('input') input: SignupInput,
    @UserAgent() userAgent: string,
  ): Promise<AuthResult> {
    return this.authService.signup(input, userAgent);
  }

  @Public()
  @Mutation(() => AuthPayload)
  login(
    @Args('input') input: LoginInput,
    @UserAgent() userAgent: string,
  ): Promise<AuthResult> {
    return this.authService.login(input.email, input.password, userAgent);
  }

  @Public()
  @Mutation(() => AuthPayload)
  refreshSession(
    @Args('input') input: RefreshTokenInput,
    @UserAgent() userAgent: string,
  ): Promise<AuthResult> {
    return this.authService.refreshSession(input.refreshToken, userAgent);
  }

  @Mutation(() => Boolean)
  async logout(
    @CurrentUser() user: User,
    @Args('input') input: RefreshTokenInput,
  ): Promise<boolean> {
    await this.authService.logout(user.id, input.refreshToken);
    return true;
  }

  @Mutation(() => Boolean)
  async logoutAll(@CurrentUser() user: User): Promise<boolean> {
    await this.authService.logoutAll(user.id);
    return true;
  }
}
