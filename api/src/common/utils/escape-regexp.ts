// Escapa os caracteres especiais de expressão regular. Usado antes de colocar o
// texto digitado pelo usuário numa busca do Mongo ($regex): sem isso, ".*"
// casaria com tudo e um "(" solto quebraria a consulta.
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
