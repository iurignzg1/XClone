// As 10 capas de perfil. O `id` é o nome que a API guarda (a mesma lista está
// em api/src/modules/users/domain/profile-cover.ts); o desenho de cada uma fica
// em Cover.module.css, numa classe com o mesmo nome.
export const COVERS = [
  { id: 'grafite', label: 'Grafite' },
  { id: 'sol', label: 'Pôr do sol' },
  { id: 'vidro', label: 'Vidro' },
  { id: 'bauhaus', label: 'Bauhaus' },
  { id: 'grade', label: 'Grade' },
  { id: 'topografia', label: 'Topografia' },
  { id: 'riscas', label: 'Riscas' },
  { id: 'meio-tom', label: 'Meio-tom' },
  { id: 'xadrez', label: 'Xadrez' },
  { id: 'granito', label: 'Granito' },
] as const;

export type CoverId = (typeof COVERS)[number]['id'];

export const DEFAULT_COVER: CoverId = 'grafite';

// A API devolve uma string; se vier um nome que este front não conhece (ex.:
// capa nova na API e front antigo), usa a padrão em vez de ficar sem desenho.
export function toCoverId(value: string): CoverId {
  return COVERS.some((cover) => cover.id === value) ? (value as CoverId) : DEFAULT_COVER;
}
