import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommonModule } from '../common/common.module.js';
import {
  Environment,
  EnvironmentVariables,
  validate,
} from '../config/env.validation.js';
import { createGraphQLErrorFormatter } from '../config/graphql-error.formatter.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { FeedModule } from '../modules/feed/feed.module.js';
import { FollowsModule } from '../modules/follows/follows.module.js';
import { LikesModule } from '../modules/likes/likes.module.js';
import { TweetsModule } from '../modules/tweets/tweets.module.js';
import { UsersModule } from '../modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', { infer: true }),
      }),
    }),
    // Async para ler o NODE_ENV já validado e decidir como mostrar os erros.
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        autoSchemaFile: join(process.cwd(), 'schema.gql'),
        sortSchema: true,
        formatError: createGraphQLErrorFormatter({
          exposeInternalErrors:
            config.get('NODE_ENV', { infer: true }) !== Environment.Production,
        }),
        context: ({ req }: { req: unknown }) => ({ req }),
      }),
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    TweetsModule,
    LikesModule,
    FollowsModule,
    FeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
