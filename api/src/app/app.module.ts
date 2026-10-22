import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommonModule } from '../common/common.module.js';
import { validate } from '../config/env.validation.js';
import { formatGraphQLError } from '../config/graphql-error.formatter.js';
import { AuthModule } from '../modules/auth/auth.module.js';
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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      formatError: formatGraphQLError,
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    TweetsModule,
    LikesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
