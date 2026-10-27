import { escapeRegExp } from './escape-regexp.js';

describe('escapeRegExp', () => {
  it('deixa texto comum como está', () => {
    expect(escapeRegExp('ana_silva')).toBe('ana_silva');
  });

  it('neutraliza os caracteres especiais', () => {
    const escaped = escapeRegExp('a.*(b)');

    expect(new RegExp(escaped).test('a.*(b)')).toBe(true);
    expect(new RegExp(escaped).test('abbbb')).toBe(false);
  });
});
