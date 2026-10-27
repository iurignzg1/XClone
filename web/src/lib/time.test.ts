import { describe, expect, it } from 'vitest';
import { timeAgo } from './time';

describe('timeAgo', () => {
  const now = new Date('2026-10-26T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('escolhe a unidade pelo tamanho do intervalo', () => {
    expect(timeAgo(ago(20_000), now)).toBe('agora');
    expect(timeAgo(ago(5 * 60_000), now)).toBe('5 min');
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3 h');
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe('2 d');
  });

  it('depois de uma semana mostra a data', () => {
    expect(timeAgo(ago(10 * 86_400_000), now)).toBe('16/10/2026');
  });

  it('data no futuro (relógios desencontrados) vira "agora"', () => {
    expect(timeAgo(ago(-60_000), now)).toBe('agora');
  });
});
