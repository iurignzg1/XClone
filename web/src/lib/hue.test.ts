import { describe, expect, it } from 'vitest';
import { hueOf } from './hue';

describe('hueOf', () => {
  it('dá sempre a mesma cor para o mesmo @usuário', () => {
    expect(hueOf('ana')).toBe(hueOf('ana'));
  });

  it('fica entre 0 e 359', () => {
    for (const name of ['a', 'ana', 'bruno_1', 'zzzzzzzzzzzzzzz']) {
      expect(hueOf(name)).toBeGreaterThanOrEqual(0);
      expect(hueOf(name)).toBeLessThan(360);
    }
  });

  it('nomes que diferem num caractere ganham cores bem diferentes', () => {
    const distance = Math.abs(hueOf('piotest1') - hueOf('piotest2'));
    expect(Math.min(distance, 360 - distance)).toBeGreaterThan(30);
  });
});
