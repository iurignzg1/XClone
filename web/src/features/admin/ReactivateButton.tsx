import { useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorBox } from '../../components/ErrorBox';
import { UnsuspendUserDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import shared from '../../styles/shared.module.css';

// "Reativar conta" (só ADMIN), com confirmação. Usado na página de
// administração e no perfil de quem está suspenso. 'active' refaz as queries
// da tela: a conta sai da lista de suspensas e o perfil perde o aviso.
export function ReactivateButton({ userId, username }: { userId: string; username: string }) {
  const [confirming, setConfirming] = useState(false);
  const [unsuspend, { loading, error }] = useMutation(UnsuspendUserDocument, {
    refetchQueries: 'active',
  });

  return (
    <>
      <button className={shared.outline} disabled={loading} onClick={() => setConfirming(true)}>
        {loading ? 'Reativando…' : 'Reativar conta'}
      </button>
      <ErrorBox error={error} />
      {confirming && (
        <ConfirmDialog
          title={`Reativar @${username}?`}
          confirmLabel="Reativar"
          tone="neutral"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void attempt(() => unsuspend({ variables: { input: { userId } } }));
          }}
        >
          A suspensão é retirada e a pessoa volta a poder entrar no Pio.
        </ConfirmDialog>
      )}
    </>
  );
}
