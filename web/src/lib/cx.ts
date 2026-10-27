// Junta nomes de classe, ignorando os vazios: cx(styles.logo, ativo && styles.on).
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
