import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Applied per-route via @UseGuards on protected handlers.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
