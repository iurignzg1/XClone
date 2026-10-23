import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TweetsModule } from '../tweets/tweets.module.js';
import { UsersModule } from '../users/users.module.js';
import { LikesService } from './application/likes.service.js';
import { LikeRepository } from './domain/like.repository.js';
import { LikeModel, LikeSchema } from './infrastructure/like.schema.js';
import { MongoLikeRepository } from './infrastructure/mongo-like.repository.js';
import { LikesResolver } from './presentation/likes.resolver.js';

@Module({
  imports: [
    TweetsModule,
    UsersModule,
    MongooseModule.forFeature([{ name: LikeModel.name, schema: LikeSchema }]),
  ],
  providers: [
    LikesService,
    LikesResolver,
    { provide: LikeRepository, useClass: MongoLikeRepository },
  ],
})
export class LikesModule {}
