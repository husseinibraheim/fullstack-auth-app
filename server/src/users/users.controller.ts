import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import type { AuthenticatedUser } from '../common/types/jwt-payload.type';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiInternalServerErrorResponse({
  description: 'Unexpected error; quote requestId to correlate with the log.',
  type: ErrorResponseDto,
})
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({
    summary: 'Current user',
    description:
      'The only endpoint that reads the database per request; the JWT strategy ' +
      'itself performs no lookup. Returns the user directly, and is what the ' +
      'client calls on boot to decide whether a stored token is still good.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'Missing, malformed, expired or invalid-signature token — or the account ' +
      'no longer exists. That last case is 401, not 404: the credential is ' +
      'what is invalid, not the resource that is missing.',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit: the global 100 requests per 60 seconds per IP.',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request): Promise<ProfileResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.users.getProfile(user.userId);
  }
}
