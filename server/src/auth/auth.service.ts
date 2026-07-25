import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import type { JwtPayload } from '../common/types/jwt-payload.type';

// Owns tokens and session. Never touches bcrypt or the User model directly —
// hashing and credential comparison belong to UsersService.
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      password: dto.password,
    });

    return this.issueToken(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResponseDto> {
    const user = await this.users.verifyCredentials(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueToken(user);
  }

  private async issueToken(user: UserDocument): Promise<AuthResponseDto> {
    const id = String(user._id);
    // sessionStart anchors the absolute cap; a fresh login starts a new session.
    const payload: JwtPayload = {
      sub: id,
      email: user.email,
      sessionStart: Math.floor(Date.now() / 1000),
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { id, email: user.email, name: user.name },
    };
  }
}
