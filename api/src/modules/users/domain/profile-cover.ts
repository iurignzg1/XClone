// Capas de perfil disponíveis. A API guarda só o nome; o desenho de cada uma
// fica no front (web/src/features/profile/covers). Para adicionar uma capa,
// inclua o nome aqui e o desenho lá.
export const PROFILE_COVERS = [
  'grafite',
  'sol',
  'vidro',
  'bauhaus',
  'grade',
  'topografia',
  'riscas',
  'meio-tom',
  'xadrez',
  'granito',
] as const;

export type ProfileCover = (typeof PROFILE_COVERS)[number];

// Capa de quem nunca escolheu (e de contas criadas antes de existir capa).
export const DEFAULT_COVER: ProfileCover = 'grafite';
