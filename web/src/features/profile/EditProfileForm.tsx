import { useMutation } from '@apollo/client/react';
import { useState, type FormEvent } from 'react';
import { ErrorBox } from '../../components/ErrorBox';
import { UpdateProfileDocument } from '../../gql/graphql';
import { attempt } from '../../lib/attempt';
import { useAuthStore } from '../auth/auth.store';
import { Cover } from './Cover';
import { COVERS, type CoverId } from './covers';
import styles from './ProfilePage.module.css';
import shared from '../../styles/shared.module.css';

const BIO_MAX = 160;

// Edita o nome de exibição, a bio e a capa de quem está logado. Ao salvar,
// atualiza o nome na sessão (barra lateral) e refaz as queries da tela.
// `onPreviewCover` avisa o perfil da capa escolhida, para ele já mostrá-la.
export function EditProfileForm({
  current,
  onDone,
  onPreviewCover,
}: {
  current: { displayName: string; bio: string; cover: CoverId };
  onDone: () => void;
  onPreviewCover?: (cover: CoverId) => void;
}) {
  const [name, setName] = useState(current.displayName);
  const [bio, setBio] = useState(current.bio);
  const [cover, setCover] = useState<CoverId>(current.cover);

  function chooseCover(next: CoverId) {
    setCover(next);
    onPreviewCover?.(next);
  }
  const [updateProfile, { loading, error }] = useMutation(UpdateProfileDocument, {
    refetchQueries: 'active',
  });

  const bioLength = bio.trim().length;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await attempt(async () => {
      const { data } = await updateProfile({ variables: { input: { displayName: name, bio, cover } } });
      if (data) useAuthStore.getState().updateUser({ displayName: data.updateProfile.displayName });
    });
    if (ok) onDone();
  }

  return (
    <form className={styles.edit} onSubmit={(e) => void onSubmit(e)} onKeyDown={(e) => e.key === 'Escape' && onDone()}>
      <label className={styles.field}>
        Nome de exibição
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoFocus required />
      </label>
      <label className={styles.field}>
        Bio
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Conte um pouco sobre você"
        />
        <span className={bioLength > BIO_MAX ? shared.error : shared.muted}>
          {bioLength}/{BIO_MAX}
        </span>
      </label>
      <fieldset className={styles.coverPicker}>
        <legend>Capa</legend>
        <div className={styles.coverGrid}>
          {COVERS.map((option) => (
            <label key={option.id} className={styles.coverOption}>
              <input
                type="radio"
                name="cover"
                value={option.id}
                checked={cover === option.id}
                onChange={() => chooseCover(option.id)}
              />
              <Cover id={option.id} className={styles.coverThumb} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.editButtons}>
        <button className={shared.primary} disabled={loading || name.trim() === '' || bioLength > BIO_MAX}>
          {loading ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className={shared.outline} onClick={onDone}>
          Cancelar
        </button>
      </div>
      <ErrorBox error={error} />
    </form>
  );
}
