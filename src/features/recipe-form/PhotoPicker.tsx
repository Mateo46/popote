/**
 * Section « Photos » du formulaire : photos déjà enregistrées (lecture seule, gérées sur
 * la fiche) et nouvelles photos choisies, affichées en aperçu avant l'enregistrement.
 * L'envoi a lieu quand on enregistre la recette (voir RecipeFormPage).
 */
import { useEffect, useMemo, type ChangeEvent } from 'react';
import { usePhotoUrls } from '../../data/hooks';
import { thumbPath } from '../../data/images';
import type { Photo } from '../../domain/recipe';
import { strings } from '../../strings';
import { Icon } from '../../ui/Icon';
import { PhotoImage } from '../../ui/PhotoImage';
import { newKey } from './draft';
import styles from './PhotoPicker.module.css';

/** Photo choisie mais pas encore envoyée : fichier de l'appareil ou image HelloFresh. */
export interface PendingPhoto {
  key: string;
  source: File | string;
  kind: Photo['kind'];
}

interface PhotoPickerProps {
  existing: Photo[];
  pending: PendingPhoto[];
  onChange: (pending: PendingPhoto[]) => void;
  disabled: boolean;
}

export function PhotoPicker({ existing, pending, onChange, disabled }: PhotoPickerProps) {
  const { data: urls } = usePhotoUrls(existing.map((photo) => thumbPath(photo.path)));

  // Aperçus locaux des fichiers choisis ; libérés quand la liste change ou à la sortie.
  const previews = useMemo(
    () =>
      pending.map((photo) => ({
        ...photo,
        url: typeof photo.source === 'string' ? photo.source : URL.createObjectURL(photo.source),
      })),
    [pending],
  );
  useEffect(
    () => () =>
      previews.forEach((photo) => {
        if (typeof photo.source !== 'string') URL.revokeObjectURL(photo.url);
      }),
    [previews],
  );

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = ''; // Permet de choisir à nouveau le même fichier.
    onChange([
      ...pending,
      ...files.map((file) => ({ key: newKey(), source: file, kind: 'user' as const })),
    ]);
  }

  return (
    <div className={styles.photos}>
      {existing.map((photo) => (
        <PhotoImage key={photo.id} src={urls?.[thumbPath(photo.path)]} className={styles.thumb} />
      ))}
      {previews.map((photo) => (
        <div key={photo.key} className={styles.pending}>
          <img src={photo.url} alt="" className={styles.thumb} />
          <button
            type="button"
            className={`${styles.remove} glass`}
            aria-label={strings.form.removePhoto}
            onClick={() => onChange(pending.filter((other) => other.key !== photo.key))}
            disabled={disabled}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      {/* Sans `capture`, iOS propose l'appareil photo et la photothèque. */}
      <label className={styles.add} aria-disabled={disabled}>
        <input
          id="form-photo-input"
          type="file"
          accept="image/*"
          multiple
          className="visually-hidden"
          onChange={handleFiles}
          disabled={disabled}
        />
        <Icon name="camera" />
        {strings.form.addPhotos}
      </label>
    </div>
  );
}
