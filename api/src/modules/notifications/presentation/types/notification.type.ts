import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationType } from '../../domain/notification.entity.js';

registerEnumType(NotificationType, { name: 'NotificationType' });

// Uma linha da página de notificações. Quem fez (`actors`) e o pio (`tweet`)
// são campos calculados, resolvidos no NotificationsResolver.
@ObjectType('Notification')
export class NotificationGqlType {
  @Field(() => ID)
  id: string;

  @Field(() => NotificationType)
  type: NotificationType;

  // Quantas pessoas ao todo (em `actors` vêm só as mais recentes).
  @Field(() => Int)
  actorsCount: number;

  @Field()
  createdAt: Date;

  @Field()
  read: boolean;
}
