import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './application/users.service.js';
import { UserRepository } from './domain/user.repository.js';
import { MongoUserRepository } from './infrastructure/mongo-user.repository.js';
import { UserModel, UserSchema } from './infrastructure/user.schema.js';
import { UsersResolver } from './presentation/users.resolver.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),
  ],
  providers: [
    UsersService,
    UsersResolver,
    { provide: UserRepository, useClass: MongoUserRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
