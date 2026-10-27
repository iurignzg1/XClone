import type { NewTweet, Tweet } from './tweet.entity.js';

export abstract class TweetRepository {
  abstract create(data: NewTweet): Promise<Tweet>;
  abstract findById(id: string): Promise<Tweet | null>;
  // Devolve true se o tweet existia e foi apagado.
  abstract deleteById(id: string): Promise<boolean>;
  // Soma `delta` ao contador de curtidas (atômico, com $inc). Devolve o tweet
  // atualizado (contador nunca menor que 0 na leitura), ou null se ele não existe.
  abstract addLikes(id: string, delta: number): Promise<Tweet | null>;
  // Tweets (sem respostas) de vários autores, do mais novo para o mais antigo.
  // Paginação por cursor: com `after` (id do último tweet já recebido), devolve
  // só os que vêm depois dele na ordem.
  abstract findByAuthors(
    authorIds: string[],
    limit: number,
    after?: string,
  ): Promise<Tweet[]>;
  // Quantas respostas cada tweet informado tem (uma consulta só). Tweet sem
  // respostas não aparece no resultado.
  abstract countReplies(parentIds: string[]): Promise<Map<string, number>>;
  // Respostas de um tweet, da mais antiga para a mais nova.
  abstract findReplies(parentId: string, limit: number): Promise<Tweet[]>;
  // Respostas que um autor escreveu, da mais nova para a mais antiga (aba
  // "Respostas" do perfil).
  abstract findRepliesByAuthor(
    authorId: string,
    limit: number,
  ): Promise<Tweet[]>;
  // Vários tweets de uma vez, em qualquer ordem (quem chama reordena).
  abstract findByIds(ids: string[]): Promise<Tweet[]>;
}
