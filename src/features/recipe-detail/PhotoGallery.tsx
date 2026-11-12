/**
 * Photos d'une recette : vignettes défilantes, ajout depuis l'appareil photo ou la
 * photothèque, et visionneuse pour choisir la couverture ou supprimer une photo.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDeletePhoto, usePhotoUrls, useSetCover, useUploadPhotos } from '../../data/hooks';
import { thumbPath } from '../../data/images';
import { coverPhoto, type Photo, type Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { GlassButton } from '../../ui/GlassButton';
import { Icon } from '../../ui/Icon';
import { PhotoImage } from '../../ui/PhotoImage';
import styles from './detail.module.css';

interface PhotoGalleryProps {
  recipe: Recipe;
  /** URL signées déjà chargées par la fiche (vignettes). */
  urls: Record<string, string> | undefined;
}

export function PhotoGallery({ recipe, urls }: PhotoGalleryProps) {
  const upload = useUploadPhotos();
  const [selected, setSelected] = useState<Photo | null>(null);
  const cover = coverPhoto(recipe);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = ''; // Permet de choisir à nouveau le même fichier.
    if (files.length) upload.mutate({ recipe, files, kind: 'user' });
  }

  return (
    <section>
      <h2 className={styles.sectionLabel}>{strings.detail.photos}</h2>
      <div className={styles.photos}>
        {recipe.photos.map((photo) => (
          <figure key={photo.id}>
            <button
              type="button"
              className={styles.photoButton}
              onClick={() => setSelected(photo)}
              aria-label={`${strings.detail.photoKinds[photo.kind]} : ouvrir la photo`}
            >
              <PhotoImage src={urls?.[thumbPath(photo.path)]} className={styles.photoThumb} />
            </button>
            <figcaption>
              {strings.detail.photoKinds[photo.kind]}
              {photo.id === cover?.id && ` · ${strings.detail.cover}`}
            </figcaption>
          </figure>
        ))}
        {/* Sans `capture`, iOS propose l'appareil photo et la photothèque. */}
        <label className={styles.addPhoto} aria-busy={upload.isPending}>
          <input
            id="recipe-photo-input"
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            onChange={handleFiles}
            disabled={upload.isPending}
          />
          <Icon name="camera" />
          {upload.isPending ? strings.detail.uploading : strings.detail.addPhoto}
        </label>
      </div>
      {upload.isError && (
        <p className={styles.error} role="alert">
          {upload.error.message || strings.detail.actionError}
        </p>
      )}

      <PhotoViewer
        recipe={recipe}
        photo={selected}
        isCover={selected?.id === cover?.id}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

interface PhotoViewerProps {
  recipe: Recipe;
  photo: Photo | null;
  isCover: boolean;
  onClose: () => void;
}

function PhotoViewer({ recipe, photo, isCover, onClose }: PhotoViewerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const setCover = useSetCover();
  const deletePhoto = useDeletePhoto();
  const { data: urls } = usePhotoUrls(photo ? [photo.path] : []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (photo && !dialog.open) dialog.showModal();
    if (!photo && dialog.open) dialog.close();
  }, [photo]);

  return (
    <dialog
      ref={ref}
      className={styles.viewer}
      aria-label={strings.detail.photos}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {photo && (
        <>
          <GlassButton
            icon="close"
            label={strings.detail.closePhoto}
            className={styles.viewerClose}
            onClick={onClose}
          />
          <PhotoImage src={urls?.[photo.path]} className={styles.viewerImage} />
          <div className={styles.viewerActions}>
            {!isCover && (
              <Button
                variant="secondary"
                onClick={() => {
                  setCover.mutate({ recipeId: recipe.id, photoId: photo.id });
                  onClose();
                }}
              >
                {strings.detail.useAsCover}
              </Button>
            )}
            <Button
              className={styles.dangerButton}
              disabled={deletePhoto.isPending}
              onClick={() => deletePhoto.mutate(photo, { onSuccess: onClose })}
            >
              <Icon name="trash" size={16} />
              {strings.detail.deletePhoto}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
