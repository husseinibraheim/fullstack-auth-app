import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import type { JwtPayload } from './types/jwt-payload.type';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export interface ProfileResponse extends PublicUser {
  createdAt: Date;
}

/**
 * Owns tokens and session. It never touches bcrypt or the User model directly:
 * hashing and credential comparison belong to UsersService, keeping the
 * dependency one-directional (AuthModule -> UsersModule).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Creates the account and returns a token immediately, so the client lands
   * signed in rather than being bounced to the login form. A duplicate email
   * surfaces as the ConflictException UsersService raises (409).
   */
  async signUp(dto: SignUpDto): Promise<AuthResponse> {
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      password: dto.password,
    });

    return this.issueToken(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResponse> {
    const user = await this.users.verifyCredentials(dto.email, dto.password);

    // One message for both unknown email and wrong password. Distinguishing
    // them (or returning 404 for an unknown address) would turn this endpoint
    // into a user-enumeration oracle.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueToken(user);
  }

  /**
   * The module's one per-request database read, behind the JWT guard.
   *
   * Answers 401 — not 404 — when the record is gone. The resource is not
   * "missing"; the credential presented is no longer valid. This is the only
   * point at which a deleted account is detected, since the strategy does no
   * lookup of its own.
   */
  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  private async issueToken(user: UserDocument): Promise<AuthResponse> {
    const id = String(user._id);
    const payload: JwtPayload = { sub: id, email: user.email };

    // Secret, algorithm (HS256) and lifetime come from JwtModule config.
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { id, email: user.email, name: user.name },
    };
  }
}
