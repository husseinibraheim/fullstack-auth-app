import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User, UserSchema } from './schemas/user.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Owns the User domain and the protected read of it (GET /users/me), along with
// the JWT verification (strategy + guard) that protects it. AuthModule imports
// UsersService from here; the dependency runs one way only, so the guard lives
// with the resource it protects rather than in AuthModule.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
