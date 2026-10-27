// Cada @usuário tem sempre a mesma cor (0 a 359 graus no círculo de cores),
// usada no avatar. O hash FNV-1a espalha bem as cores: nomes parecidos, como
// "ana1" e "ana2", caem em cores bem diferentes.
export function hueOf(username: string): number {
  let hash = 2166136261;
  for (const char of username) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 360;
}
