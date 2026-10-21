export class UserConflictError extends Error {
  constructor(readonly field: 'username' | 'email') {
    super(`User ${field} already in use`);
    this.name = 'UserConflictError';
  }
}
