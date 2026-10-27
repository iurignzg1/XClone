import type { ProfileCover } from './profile-cover.js';
import type { UserRole } from './user-role.enum.js';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  bio: string;
  cover: ProfileCover;
  suspended: boolean;
  createdAt: Date;
}

export interface NewUser {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
}

// O que a própria pessoa pode editar no perfil.
export interface ProfileChanges {
  displayName: string;
  bio: string;
  cover: ProfileCover;
}
