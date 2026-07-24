import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto, ProfileResponseDto } from './dto/auth-response.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import type { AuthenticatedUser } from './types/jwt-payload.type';

@ApiTags('auth')
@ApiInternalServerErrorResponse({
  description:
    'Unexpected error. The body is deliberately generic; quote requestId to ' +
    'correlate with the server log, which holds the real cause.',
  type: ErrorResponseDto,
})
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
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Creates the user and returns a token immediately, so the client lands ' +
      'signed in rather than being redirected to the login form.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description:
      'Validation failed. `errors` maps each field to every unmet rule.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Email already registered. Enforced by a unique index, so the check ' +
      'cannot race a concurrent signup.',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit: 10 requests per hour per IP.',
    type: ErrorResponseDto,
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post('signup')
  signUp(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.auth.signUp(dto);
  }

  /**
   * 200, not Nest's default 201 — signing in creates no resource.
   *
   * The tightest limit in the app: this is the brute-force surface, and each
   * attempt costs ~300ms of bcrypt on a threadpool of four, so an unlimited
   * login endpoint is a CPU exhaustion vector as much as a credential one.
   */
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Returns 200 rather than 201 because no resource is created. Failures ' +
      'return one identical message for both an unknown email and a wrong ' +
      'password, and never 404, so the endpoint cannot be used to enumerate ' +
      'registered addresses.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    description: 'Malformed body — missing field or non-string value.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '"Invalid email or password" — identical for both causes.',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit: 5 requests per 60 seconds per IP.',
    type: ErrorResponseDto,
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signIn(@Body() dto: SignInDto): Promise<AuthResponseDto> {
    return this.auth.signIn(dto);
  }

  /** Protected by the global guard: no decorator needed, absence of @Public() is the point. */
  @ApiOperation({
    summary: 'Current user',
    description:
      'The only endpoint that reads the database per request; the JWT ' +
      'strategy itself performs no lookup. Returns the user directly rather ' +
      'than wrapped, and is what the client calls on boot to decide whether a ' +
      'stored token is still good.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'Missing, malformed, expired or invalid-signature token — or the ' +
      'account no longer exists. That last case is 401, not 404: the ' +
      'credential is what is invalid, not the resource that is missing.',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit: the global 100 requests per 60 seconds per IP.',
    type: ErrorResponseDto,
  })
  @Get('me')
  me(@CurrentUser() current: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.auth.getProfile(current.userId);
  }
}
