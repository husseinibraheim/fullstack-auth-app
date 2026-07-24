import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  // AuthModule will import UsersService; the dependency runs one way only,
  // AuthModule -> UsersModule. UsersModule knows nothing about tokens.
  exports: [UsersService],
})
export class UsersModule {}
