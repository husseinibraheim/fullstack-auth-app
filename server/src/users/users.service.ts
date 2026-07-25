import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { isValidObjectId, Model } from 'mongoose';
import type { AppConfig } from '../config/env.config';
import { CreateUserDto } from './dto/create-user.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { normalizeEmail } from './normalize-email';
import { User, UserDocument } from './schemas/user.schema';

const DUPLICATE_KEY = 11000;

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === DUPLICATE_KEY
  );
}

// Owns persistence, password hashing, and credential verification. bcrypt lives
// here and nowhere else.
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    try {
      return await this.userModel.create({
        email: normalizeEmail(dto.email),
        name: dto.name.trim(),
        passwordHash,
      });
    } catch (err) {
      // Uniqueness is enforced by the index, so translate E11000 into a 409
      // rather than letting a driver 500 reach the client.
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: normalizeEmail(email) }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    // Guard against a malformed `sub` so a junk token yields null, not a 500.
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.findById(userId);
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

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: normalizeEmail(email) })
      .select('+passwordHash')
      .exec();
  }

  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.findByEmailWithPassword(email);
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return null;
    }

    return this.findByEmail(email);
  }
}
