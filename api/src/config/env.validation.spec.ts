// O class-transformer lê os decorators via reflect-metadata, que o Nest
// carrega sozinho na API; aqui o teste não passa pelo Nest.
import 'reflect-metadata';
import { validate } from './env.validation.js';

// Um .env completo e válido; cada teste muda só o que interessa.
const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  MONGODB_URI: 'mongodb+srv://usuario:senha@cluster.mongodb.net/xclone',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validate (.env)', () => {
  it('aceita um .env completo e converte os números', () => {
    const env = validate(valid);

    expect(env.PORT).toBe(3000);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_SECONDS).toBe(604800);
    expect(env.SESSION_MAX_LIFETIME_SECONDS).toBe(2592000);
    expect(env.CORS_ORIGIN.split(',')).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);
  });

  it('aceita várias origens do front, separadas por vírgula', () => {
    const env = validate({
      ...valid,
      CORS_ORIGIN: 'http://localhost:5173,https://xclone.exemplo.com',
    });

    expect(env.CORS_ORIGIN.split(',')).toHaveLength(2);
  });

  it('recusa origem com caminho ou barra no fim', () => {
    expect(() =>
      validate({ ...valid, CORS_ORIGIN: 'http://localhost:5173/' }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('aceita a URI local do Mongo (mongodb://)', () => {
    expect(() =>
      validate({ ...valid, MONGODB_URI: 'mongodb://localhost:27017/xclone' }),
    ).not.toThrow();
  });

  it('recusa MONGODB_URI vazia ou que não é do Mongo', () => {
    expect(() => validate({ ...valid, MONGODB_URI: '' })).toThrow(
      /MONGODB_URI deve começar com mongodb/,
    );
    expect(() =>
      validate({ ...valid, MONGODB_URI: 'https://cluster.mongodb.net' }),
    ).toThrow(/MONGODB_URI deve começar com mongodb/);
  });

  it('recusa segredo do JWT com menos de 32 caracteres', () => {
    expect(() => validate({ ...valid, JWT_ACCESS_SECRET: 'curto' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('recusa porta fora do intervalo', () => {
    expect(() => validate({ ...valid, PORT: '70000' })).toThrow(/PORT/);
  });
});
