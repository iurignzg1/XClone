import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { FollowsService } from './application/follows.service.js';
import { FollowRepository } from './domain/follow.repository.js';
import { FollowModel, FollowSchema } from './infrastructure/follow.schema.js';
import { MongoFollowRepository } from './infrastructure/mongo-follow.repository.js';
import { FollowsResolver } from './presentation/follows.resolver.js';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: FollowModel.name, schema: FollowSchema },
    ]),
  ],
  providers: [
    FollowsService,
    FollowsResolver,
    { provide: FollowRepository, useClass: MongoFollowRepository },
  ],
  exports: [FollowsService],
})
export class FollowsModule {}
