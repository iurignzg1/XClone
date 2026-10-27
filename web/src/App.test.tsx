import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ana,
  bia,
  caio,
  deleteForbiddenMock,
  feedMock,
  likedTweetsMock,
  createTweetMock,
  feedOfflineMock,
  followersMock,
  followingMock,
  loginAs,
  loginMock,
  logout,
  manyTweets,
  profileMock,
  searchUsersMock,
  searchUsersSlowMock,
  suggestedUsersMock,
  suspendedUsersMock,
  toggleLikeErrorMock,
  toggleLikeMock,
  tweet,
  tweetDetailMock,
  tweetLikesMock,
  unsuspendMock,
  updateProfileMock,
  userRepliesMock,
  userTweetsMock,
} from './test/mocks';
import { renderApp } from './test/renderApp';

afterEach(logout);

describe('rotas e acesso', () => {
  it('sem sessão, manda para o login e esconde o resto', () => {
    renderApp('/home');

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByRole('heading', { name: /Feed/ })).not.toBeInTheDocument();
  });

  it('depois do login, volta para a página que o visitante queria abrir', async () => {
    renderApp('/pio/t1', [loginMock('ana@x.com', 'senha-segura'), tweetDetailMock('t1')]);

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@x.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('olá mundo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pio', level: 2 })).toBeInTheDocument();
  });

  it('logado, /login leva para a home', async () => {
    loginAs();
    renderApp('/login', [feedMock([])]);

    expect(await screen.findByRole('heading', { name: /Feed/ })).toBeInTheDocument();
  });

  it('/admin é só para ADMIN: usuário comum volta para a home', async () => {
    loginAs('USER');
    renderApp('/admin', [feedMock([])]);

    expect(await screen.findByRole('heading', { name: /Feed/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Administração' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('/admin abre para ADMIN, que vê o link no menu', async () => {
    loginAs('ADMIN');
    renderApp('/admin');

    expect(await screen.findByRole('heading', { name: 'Administração' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('mostra a logo preta para o tema claro e a branca para o escuro', () => {
    renderApp();

    const logos = screen.getAllByAltText('Pio');

    // O CSS escolhe qual das duas aparece; aqui conferimos que as duas existem.
    expect(logos.map((logo) => logo.getAttribute('src'))).toEqual([
      '/logo-preta.svg',
      '/logo-branca.svg',
    ]);
  });
});

describe('feed', () => {
  it('logado, mostra quem é o usuário e o feed', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet()])]);

    expect(await screen.findByText('olá mundo')).toBeInTheDocument();
    expect(screen.getByText(/@bia/)).toBeInTheDocument();
    expect(screen.getByText(/@ana/)).toBeInTheDocument();
  });

  it('curtir é otimista: o coração enche na hora, antes de o servidor responder', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet()]), toggleLikeMock('t1', 1, 300)]);

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir (0)' }));

    // O servidor só responde depois de 300 ms; a tela já mudou.
    expect(screen.getByRole('button', { name: 'Descurtir (1)' })).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Descurtir (1)' });
  });

  it('se a curtida falhar no servidor, a mudança otimista é desfeita', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet()]), toggleLikeErrorMock('t1')]);

    await userEvent.click(await screen.findByRole('button', { name: 'Curtir (0)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Pio não encontrado');
    expect(screen.getByRole('button', { name: 'Curtir (0)' })).toBeInTheDocument();
  });

  it('"Quem curtiu" lista os usuários que curtiram', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet({ likesCount: 1 })]), tweetLikesMock('t1', [caio], true)]);

    await userEvent.click(await screen.findByRole('button', { name: 'Quem curtiu' }));

    expect(await screen.findByText('Caio')).toBeInTheDocument();
    expect(screen.getByText('@caio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
  });

  it('mostra o código do erro quando o back recusa a ação (FORBIDDEN)', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet({ author: { __typename: 'User', ...ana } })]), deleteForbiddenMock('t1')]);

    await userEvent.click(await screen.findByRole('button', { name: 'Apagar' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Apagar pio?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'FORBIDDEN: Você só pode apagar os seus próprios pios',
    );
  });

  it('carrega mais pios com o cursor (id do último) e some o botão no fim', async () => {
    loginAs();
    renderApp('/home', [
      feedMock(manyTweets(20)),
      feedMock([tweet({ id: 't21', content: 'pio 21' })], { limit: 20, after: 't20' }),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('pio 21')).toBeInTheDocument();
    expect(screen.getByText('pio 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
    expect(screen.getByText('Você chegou ao fim do feed.')).toBeInTheDocument();
  });

  it('com a API fora do ar, explica o problema em vez de só "Failed to fetch"', async () => {
    loginAs();
    renderApp('/home', [feedOfflineMock()]);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não consegui falar com a API/);
    expect(screen.getByRole('alert')).toHaveTextContent(/npm run start/);
  });

  it('mostra quantas respostas o pio tem', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet({ repliesCount: 3 })])]);

    expect(await screen.findByRole('link', { name: 'Responder (3)' })).toHaveAttribute('href', '/pio/t1');
  });

  it('clicar no pio abre o detalhe com as respostas', async () => {
    loginAs();
    renderApp('/home', [
      feedMock([tweet({ repliesCount: 1 })]),
      tweetDetailMock('t1', [tweet({ id: 't2', content: 'resposta aqui', parentId: 't1' })]),
    ]);

    await userEvent.click(await screen.findByText('olá mundo'));

    expect(await screen.findByText('resposta aqui')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pio', level: 2 })).toBeInTheDocument();
  });

  it('clicar num botão do pio não abre o detalhe', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet()]), tweetLikesMock('t1', [], false)]);

    await userEvent.click(await screen.findByRole('button', { name: 'Quem curtiu' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pio', level: 2 })).not.toBeInTheDocument();
  });

  it('usuário comum só vê "Apagar" nos próprios pios', async () => {
    loginAs('USER');
    renderApp('/home', [
      feedMock([
        tweet({ id: 't1', author: { __typename: 'User', ...ana } }),
        tweet({ id: 't2', content: 'da Bia' }),
      ]),
    ]);

    await screen.findByText('da Bia');

    expect(screen.getAllByRole('button', { name: 'Apagar' })).toHaveLength(1);
  });

  it('moderador e admin veem "Apagar" nos pios de qualquer um', async () => {
    loginAs('ADMIN');
    renderApp('/home', [feedMock([tweet()])]);

    expect(await screen.findByRole('button', { name: 'Apagar' })).toBeInTheDocument();
  });

  it('enquanto carrega, mostra o esqueleto dos pios', () => {
    loginAs();
    renderApp('/home', [feedMock([tweet()])]);

    expect(screen.getByRole('status', { name: 'Carregando pios' })).toBeInTheDocument();
  });
});

describe('barra lateral: pesquisa e perfil', () => {
  it('clicar na própria conta abre o seu perfil', async () => {
    loginAs();
    renderApp('/home', [feedMock([]), profileMock(ana, 'minha bio'), userTweetsMock('ana', [])]);
    await screen.findByRole('heading', { name: /Feed/ });

    await userEvent.click(screen.getByRole('link', { name: /Ana\s*@ana/ }));

    expect(await screen.findByText('minha bio')).toBeInTheDocument();
  });

  it('"Pesquisar" abre a página de pesquisa; o resultado leva ao perfil', async () => {
    loginAs();
    renderApp('/home', [
      feedMock([]),
      searchUsersMock('bi', [bia]),
      profileMock(bia, 'oi, sou a Bia'),
      userTweetsMock('bia', []),
    ]);
    await screen.findByRole('heading', { name: /Feed/ });

    await userEvent.click(screen.getByRole('link', { name: 'Pesquisar' }));
    expect(screen.getByText('Procure pessoas pelo @ ou pelo nome.')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Pesquisar pessoas' }), 'bi');
    await userEvent.click(await screen.findByRole('link', { name: /Bia\s*@bia/ }));

    expect(await screen.findByText('oi, sou a Bia')).toBeInTheDocument();
  });

  it('o termo vem do endereço: /pesquisar?q=... já mostra o resultado', async () => {
    loginAs();
    renderApp('/pesquisar?q=zzz', [searchUsersMock('zzz', [])]);

    expect(screen.getByRole('searchbox', { name: 'Pesquisar pessoas' })).toHaveValue('zzz');
    expect(await screen.findByText('Ninguém encontrado para “zzz”.')).toBeInTheDocument();
  });
});

describe('confirmação de ações sérias', () => {
  it('apagar um pio pede confirmação; Cancelar fecha sem apagar', async () => {
    loginAs();
    // Sem mock da mutation: se ela fosse chamada, apareceria um erro na tela.
    renderApp('/home', [feedMock([tweet({ author: { __typename: 'User', ...ana } })])]);

    await userEvent.click(await screen.findByRole('button', { name: 'Apagar' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Apagar pio?' });
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('olá mundo')).toBeInTheDocument();
  });

  it('Esc também cancela a confirmação', async () => {
    loginAs();
    renderApp('/home', [feedMock([tweet({ author: { __typename: 'User', ...ana } })])]);

    await userEvent.click(await screen.findByRole('button', { name: 'Apagar' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Sair pede confirmação: cancelar mantém a sessão, confirmar volta para o login', async () => {
    loginAs();
    renderApp('/home', [feedMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: /Feed/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Sair do Pio?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('o menu de sair abre no ícone e fecha com Esc, devolvendo o foco', async () => {
    loginAs();
    renderApp('/home', [feedMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });
    const trigger = screen.getByRole('button', { name: 'Sair da conta' });

    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('"Sair de todos os aparelhos" explica que encerra as outras sessões', async () => {
    loginAs();
    renderApp('/home', [feedMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair de todos os aparelhos' }));

    expect(screen.getByRole('alertdialog', { name: 'Sair de todos os aparelhos?' })).toHaveTextContent(
      /outros celulares e computadores/,
    );
  });
});

describe('detalhe do pio e perfil', () => {
  it('o detalhe do pio mostra o pio e as respostas', async () => {
    loginAs();
    renderApp('/pio/t1', [
      tweetDetailMock('t1', [tweet({ id: 't2', content: 'resposta aqui', parentId: 't1' })]),
    ]);

    expect(await screen.findByText('olá mundo')).toBeInTheDocument();
    expect(await screen.findByText('resposta aqui')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
  });

  it('/:username abre o perfil desse usuário', async () => {
    loginAs();
    renderApp('/bia', [profileMock(bia, 'oi, sou a Bia'), userTweetsMock('bia', [tweet()])]);

    expect(await screen.findByText('oi, sou a Bia')).toBeInTheDocument();
    expect(await screen.findByText('olá mundo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    expect(screen.queryByText('USER')).not.toBeInTheDocument();
  });

  it.each(['ADMIN', 'MODERATOR'])('o perfil de um %s mostra o selo do papel', async (role) => {
    loginAs();
    renderApp('/bia', [profileMock(bia, 'oi', role), userTweetsMock('bia', [])]);

    expect(await screen.findByText(role)).toBeInTheDocument();
  });

  it('a barra lateral só mostra o papel de quem não é usuário comum', async () => {
    loginAs('USER');
    renderApp('/home', [feedMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });
    expect(screen.getByText('@ana')).toBeInTheDocument();
  });

  it('a barra lateral mostra o papel do ADMIN logado', async () => {
    loginAs('ADMIN');
    renderApp('/home', [feedMock([])]);

    const account = await screen.findByRole('link', { name: /Ana\s*@ana\s*ADMIN/ });
    expect(within(account).getByText('ADMIN')).toBeInTheDocument();
  });

  it('no próprio perfil, dá para editar nome e bio, que mudam na tela e na barra lateral', async () => {
    loginAs();
    renderApp('/ana', [
      profileMock(ana, 'minha bio'),
      userTweetsMock('ana', []),
      updateProfileMock('Ana Maria', 'Nova bio do perfil'),
      profileMock({ ...ana, displayName: 'Ana Maria' }, 'Nova bio do perfil'),
      userTweetsMock('ana', []),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    const name = screen.getByLabelText('Nome de exibição');
    await userEvent.clear(name);
    await userEvent.type(name, 'Ana Maria');
    const bio = screen.getByLabelText(/^Bio/);
    expect(bio).toHaveValue('minha bio');
    await userEvent.clear(bio);
    await userEvent.type(bio, 'Nova bio do perfil');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('heading', { name: 'Ana Maria', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Nova bio do perfil')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome de exibição')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Maria', { selector: 'strong' })).toBeInTheDocument();
  });

  it('o formulário de perfil mostra o contador da bio e o Cancelar fecha sem salvar', async () => {
    loginAs();
    renderApp('/ana', [profileMock(ana, 'oi'), userTweetsMock('ana', [])]);

    await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    expect(screen.getByText('2/160')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Nome de exibição')).not.toBeInTheDocument();
    expect(screen.getByText('oi')).toBeInTheDocument();
  });

  it('escolher uma capa mostra a prévia e envia a capa ao salvar', async () => {
    loginAs();
    renderApp('/ana', [
      profileMock(ana, 'oi'),
      userTweetsMock('ana', []),
      updateProfileMock('Ana', 'oi', 'sol'),
      profileMock(ana, 'oi'),
      userTweetsMock('ana', []),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    expect(screen.getByRole('radio', { name: 'Grafite' })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    await userEvent.click(screen.getByRole('radio', { name: 'Pôr do sol' }));
    expect(screen.getByRole('radio', { name: 'Pôr do sol' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    // O mock da mutation só responde se a capa enviada for 'sol'.
    expect(await screen.findByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clicar em "seguidores" abre a lista de quem segue o perfil', async () => {
    loginAs();
    renderApp('/bia', [profileMock(bia, 'oi'), userTweetsMock('bia', []), followersMock('bia', [caio])]);

    await userEvent.click(await screen.findByRole('button', { name: '3 seguidores' }));

    const dialog = await screen.findByRole('dialog', { name: 'Seguidores' });
    expect(await within(dialog).findByText('Caio')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
  });

  it('clicar em "seguindo" abre a lista de quem o perfil segue', async () => {
    loginAs();
    renderApp('/bia', [profileMock(bia, 'oi'), userTweetsMock('bia', []), followingMock('bia', [caio])]);

    await userEvent.click(await screen.findByRole('button', { name: '1 seguindo' }));

    const dialog = await screen.findByRole('dialog', { name: 'Seguindo' });
    expect(await within(dialog).findByText('Caio')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
  });

  it('a lista vazia avisa, e Esc fecha a janela', async () => {
    loginAs();
    renderApp('/bia', [profileMock(bia, 'oi'), userTweetsMock('bia', []), followersMock('bia', [])]);

    await userEvent.click(await screen.findByRole('button', { name: '3 seguidores' }));
    expect(await screen.findByText('Ninguém segue @bia ainda.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Seguidores' })).not.toBeInTheDocument();
  });

  it('no perfil de outra pessoa não existe "Editar perfil"', async () => {
    loginAs();
    renderApp('/bia', [profileMock(bia, 'oi'), userTweetsMock('bia', [])]);

    await screen.findByText('oi');

    expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument();
  });
});

describe('composer, sugestões, abas e atalhos', () => {
  it('"Publicar" da barra lateral abre o composer em janela, que fecha ao publicar', async () => {
    loginAs();
    renderApp('/home', [feedMock([]), createTweetMock('pio pela janela'), feedMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });

    await userEvent.click(screen.getAllByRole('button', { name: 'Publicar' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Novo pio' });
    await userEvent.type(within(dialog).getByRole('textbox'), 'pio pela janela');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo pio' })).not.toBeInTheDocument());
  });

  it('o composer em janela fecha com Esc', async () => {
    loginAs();
    renderApp('/home', [feedMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });

    await userEvent.click(screen.getAllByRole('button', { name: 'Publicar' })[0]);
    expect(screen.getByRole('dialog', { name: 'Novo pio' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Novo pio' })).not.toBeInTheDocument();
  });

  it('a home mostra "Quem seguir" com as sugestões', async () => {
    loginAs();
    renderApp('/home', [feedMock([]), suggestedUsersMock([bia, caio])]);

    const box = await screen.findByRole('region', { name: 'Quem seguir' });
    expect(await within(box).findByText('Bia')).toBeInTheDocument();
    expect(within(box).getAllByRole('button', { name: 'Seguir' })).toHaveLength(2);
  });

  it('sem sugestões, o bloco "Quem seguir" não aparece', async () => {
    loginAs();
    renderApp('/home', [feedMock([]), suggestedUsersMock([])]);
    await screen.findByRole('heading', { name: /Feed/ });

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Quem seguir' })).not.toBeInTheDocument());
  });

  it('as abas do perfil trocam entre pios, respostas e curtidas', async () => {
    loginAs();
    renderApp('/bia', [
      profileMock(bia, 'oi'),
      userTweetsMock('bia', [tweet({ content: 'um pio da Bia' })]),
      userRepliesMock('bia', [tweet({ id: 't9', content: 'uma resposta da Bia', parentId: 't1' })]),
      likedTweetsMock('bia', []),
    ]);

    expect(await screen.findByText('um pio da Bia')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pios' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('tab', { name: 'Respostas' }));
    expect(await screen.findByText('uma resposta da Bia')).toBeInTheDocument();

    // Seta para a direita passa para a próxima aba (Curtidas).
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Curtidas' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('@bia ainda não curtiu nada.')).toBeInTheDocument();
  });

  it('o endereço antigo /tweet/:id leva ao /pio/:id', async () => {
    loginAs();
    renderApp('/tweet/t1', [tweetDetailMock('t1')]);

    expect(await screen.findByRole('heading', { name: 'Pio', level: 2 })).toBeInTheDocument();
    expect(await screen.findByText('olá mundo')).toBeInTheDocument();
  });

  it('a pesquisa mostra o esqueleto de pessoas enquanto busca', async () => {
    loginAs();
    renderApp('/pesquisar?q=bi', [searchUsersSlowMock('bi', [bia])]);

    expect(screen.getByRole('status', { name: 'Carregando pessoas' })).toBeInTheDocument();
    expect(await screen.findByText('Bia')).toBeInTheDocument();
  });
});

describe('administração: contas suspensas', () => {
  it('lista as contas suspensas e reativa uma, com confirmação', async () => {
    loginAs('ADMIN');
    renderApp('/admin', [suspendedUsersMock([caio]), unsuspendMock('u3'), suspendedUsersMock([])]);

    expect(await screen.findByText('Caio')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reativar conta' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Reativar @caio?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reativar' }));

    expect(await screen.findByText('Nenhuma conta suspensa.')).toBeInTheDocument();
  });

  it('sem contas suspensas, avisa', async () => {
    loginAs('ADMIN');
    renderApp('/admin', [suspendedUsersMock([])]);

    expect(await screen.findByText('Nenhuma conta suspensa.')).toBeInTheDocument();
  });

  it('no perfil de quem está suspenso, o ADMIN vê "Reativar conta" e não "Suspender conta"', async () => {
    loginAs('ADMIN');
    renderApp('/caio', [profileMock(caio, 'oi', 'USER', true), userTweetsMock('caio', [])]);

    expect(await screen.findByText('conta suspensa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar conta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspender conta' })).not.toBeInTheDocument();
  });

  it('usuário comum não vê "Reativar conta" num perfil suspenso', async () => {
    loginAs('USER');
    renderApp('/caio', [profileMock(caio, 'oi', 'USER', true), userTweetsMock('caio', [])]);

    expect(await screen.findByText('conta suspensa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reativar conta' })).not.toBeInTheDocument();
  });
});
