// Cada @usuário tem sempre a mesma cor (0 a 359 graus no círculo de cores),
// usada no avatar e no destaque do perfil.
export function hueOf(username: string): number {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}
