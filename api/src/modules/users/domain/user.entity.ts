import type { UserRole } from './user-role.enum.js';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  bio: string;
  suspended: boolean;
  createdAt: Date;
}

export interface NewUser {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
}
