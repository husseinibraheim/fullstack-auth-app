import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import type { AppConfig } from '../config/env.config';
import { CreateUserDto } from './dto/create-user.dto';
import { normalizeEmail } from './normalize-email';
import { User, UserDocument } from './schemas/user.schema';

/** Mongo's duplicate-key error code. */
const DUPLICATE_KEY = 11000;

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === DUPLICATE_KEY
  );
}

/**
 * Owns everything about the User: persistence, password hashing, and credential
 * verification. bcrypt lives here and nowhere else — AuthService asks this
 * service to verify a password rather than reaching for the hash itself.
 */
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
      // The unique index enforces email uniqueness at the database, not in
      // application code, so the check and the insert cannot race. Translate
      // the raw driver error into a 409 here so it never reaches the client
      // as a 500 full of driver internals.
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('Email is already registered');
      }
      throw err;
    }
  }

  /** Safe lookup: the returned document never carries passwordHash. */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: normalizeEmail(email) }).exec();
  }

  /**
   * The one finder that returns passwordHash, named so the danger is
   * unmistakable. Use only for credential verification; never return the
   * result to a client.
   */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: normalizeEmail(email) })
      .select('+passwordHash')
      .exec();
  }

  /**
   * Verify an email/password pair. Returns the (hash-free) user on success and
   * null on any failure — unknown email and wrong password are indistinguishable
   * to the caller, so it cannot build a user-enumeration oracle.
   */
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

    // Re-fetch without the hash so callers can never accidentally serialize it.
    return this.findByEmail(email);
  }
}
