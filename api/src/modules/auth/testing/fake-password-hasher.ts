import { PasswordHasher } from '../domain/password-hasher.js';

// "Hash" de mentira (rápido e previsível), só para os testes.

export class FakePasswordHasher extends PasswordHasher {
  hash(plain: string) {
    return Promise.resolve(`hashed:${plain}`);
  }
  verify(hash: string, plain: string) {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}
