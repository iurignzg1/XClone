// As mutations do Apollo rejeitam a promise quando dão erro. Aqui o erro já é
// mostrado na tela pelo estado do hook (`error`), então só evitamos o aviso de
// "unhandled promise rejection".
export async function attempt(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch {
    return false;
  }
}
