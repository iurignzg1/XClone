export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

// Papéis que podem moderar conteúdo de outros usuários.
export const MODERATION_ROLES: readonly UserRole[] = [
  UserRole.MODERATOR,
  UserRole.ADMIN,
];
