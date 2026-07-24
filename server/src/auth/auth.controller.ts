import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  AuthService,
  type AuthResponse,
  type ProfileResponse,
} from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import type { AuthenticatedUser } from './types/jwt-payload.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * 201: a user is created. Nest's default for POST, so nothing to override.
   *
   * Rate limited to stop bulk account creation. Set generously because the
   * throttler counts every request to the route, including the 400s a client
   * generates while probing the password rules.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post('signup')
  signUp(@Body() dto: SignUpDto): Promise<AuthResponse> {
    return this.auth.signUp(dto);
  }

  /**
   * 200, not Nest's default 201 — signing in creates no resource.
   *
   * The tightest limit in the app: this is the brute-force surface, and each
   * attempt costs ~300ms of bcrypt on a threadpool of four, so an unlimited
   * login endpoint is a CPU exhaustion vector as much as a credential one.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signIn(@Body() dto: SignInDto): Promise<AuthResponse> {
    return this.auth.signIn(dto);
  }

  /** Protected by the global guard: no decorator needed, absence of @Public() is the point. */
  @Get('me')
  me(@CurrentUser() current: AuthenticatedUser): Promise<ProfileResponse> {
    return this.auth.getProfile(current.userId);
  }
}
