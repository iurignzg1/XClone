// A logo tem uma versão para cada tema: a preta aparece no tema claro e a
// branca no escuro. As duas ficam no HTML e o CSS (index.css) mostra a certa,
// pelo mesmo prefers-color-scheme que troca as cores do resto do app. A que
// está escondida (display: none) não é lida por leitores de tela.
export function Logo() {
  return (
    <>
      <img className="logo logo-light-theme" src="/logo-preta.svg" alt="XClone" />
      <img className="logo logo-dark-theme" src="/logo-branca.svg" alt="XClone" />
    </>
  );
}
