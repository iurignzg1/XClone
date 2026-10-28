import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TweetsModule } from '../tweets/tweets.module.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationRepository } from './domain/notification.repository.js';
import { MongoNotificationRepository } from './infrastructure/mongo-notification.repository.js';
import {
  NotificationModel,
  NotificationSchema,
} from './infrastructure/notification.schema.js';
import { NotificationsResolver } from './presentation/notifications.resolver.js';

@Module({
  imports: [
    UsersModule,
    TweetsModule,
    MongooseModule.forFeature([
      { name: NotificationModel.name, schema: NotificationSchema },
    ]),
  ],
  providers: [
    NotificationsService,
    NotificationsResolver,
    { provide: NotificationRepository, useClass: MongoNotificationRepository },
  ],
})
export class NotificationsModule {}
