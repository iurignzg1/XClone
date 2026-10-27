import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProfileInput } from './update-profile.input.js';

// Roda as mesmas regras que o ValidationPipe aplica ao input da mutation.
function errorsFor(input: Record<string, unknown>): string[] {
  const dto = plainToInstance(UpdateProfileInput, input);
  return validateSync(dto).flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('UpdateProfileInput', () => {
  const valid = { displayName: 'Ana', bio: 'oi', cover: 'sol' };

  it('aceita um perfil válido', () => {
    expect(errorsFor(valid)).toEqual([]);
  });

  it('recusa uma capa que não está na lista', () => {
    expect(errorsFor({ ...valid, cover: 'arco-iris' })).toEqual([
      'capa desconhecida',
    ]);
  });

  it('recusa nome só de espaços (o trim vem antes da regra)', () => {
    expect(errorsFor({ ...valid, displayName: '   ' })).toHaveLength(1);
  });

  it('recusa bio com mais de 160 caracteres', () => {
    expect(errorsFor({ ...valid, bio: 'a'.repeat(161) })).toHaveLength(1);
  });
});
