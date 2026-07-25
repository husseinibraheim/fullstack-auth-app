import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
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
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

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
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post('signup')
  signUp(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.auth.signUp(dto);
  }

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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signIn(@Body() dto: SignInDto): Promise<AuthResponseDto> {
    return this.auth.signIn(dto);
  }
}
