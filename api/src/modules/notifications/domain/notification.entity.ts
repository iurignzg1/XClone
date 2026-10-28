export enum NotificationType {
  // Curtiram um pio seu.
  LIKE = 'LIKE',
  // Responderam um pio seu.
  REPLY = 'REPLY',
  // Começaram a seguir você.
  FOLLOW = 'FOLLOW',
}

// Um acontecimento: `actorId` fez algo que interessa a `recipientId`.
// tweetId: o pio curtido (LIKE), a resposta (REPLY) ou null (FOLLOW).
export interface NotificationEvent {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  tweetId: string | null;
}

// Uma linha da página de notificações. As curtidas do mesmo pio viram uma
// linha só ("Ana e mais 4 pessoas curtiram seu pio"); respostas e novos
// seguidores são uma linha cada.
export interface NotificationGroup {
  id: string;
  type: NotificationType;
  tweetId: string | null;
  // Quem fez, do mais recente para o mais antigo (só os primeiros).
  actorIds: string[];
  // Quantas pessoas fizeram, ao todo.
  actorsCount: number;
  // Quando aconteceu o mais recente.
  createdAt: Date;
  // false se alguma parte do grupo ainda não foi vista.
  read: boolean;
}
