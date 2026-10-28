import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { NotificationRepository } from '../domain/notification.repository.js';
import { NotificationsService } from './notifications.service.js';

// As regras das notificações (agrupar, não avisar a si mesmo, desfazer apaga o
// aviso, pio apagado) são testadas de ponta a ponta, com o Mongo de verdade,
// em test/notificacoes.e2e-spec.ts. Aqui fica só o que o e2e não alcança:
// uma falha do banco ao gravar a notificação.

describe('NotificationsService', () => {
  it('se gravar a notificação falhar, o erro não chega a quem curtiu', async () => {
    const failing = {
      add: () => Promise.reject(new Error('banco fora do ar')),
    } as unknown as NotificationRepository;
    const service = new NotificationsService(failing);
    // O erro vai para o log da API; aqui só silenciamos a saída do teste.
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      service.handleLiked({
        userId: 'bia',
        tweetId: 't1',
        tweetAuthorId: 'ana',
      }),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
