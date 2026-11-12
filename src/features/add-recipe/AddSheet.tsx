/**
 * Feuille « Ajouter une recette », ouverte par le « + » de l'écran Recettes :
 * lien HelloFresh (import puis relecture) ou saisie manuelle.
 *
 * Feuille flottante en Liquid Glass (élément natif <dialog>, détente moyenne).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useImportHellofresh, useRecipes } from '../../data/hooks';
import type { Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { GlassButton } from '../../ui/GlassButton';
import { Icon } from '../../ui/Icon';
import { extractUrl, hellofreshIdInUrl } from './link';
import styles from './AddSheet.module.css';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddSheet({ open, onClose }: AddSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { data: recipes = [] } = useRecipes();
  const importRecipe = useImportHellofresh();
  const [link, setLink] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Recipe | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function reset() {
    setMessage(null);
    setDuplicate(null);
    importRecipe.reset();
  }

  function close() {
    reset();
    setLink('');
    onClose();
  }

  /** Recette déjà enregistrée pour ce lien (même identifiant HelloFresh ou même adresse). */
  function findExisting(id: string | null, url: string | null) {
    return (
      recipes.find(
        (recipe) => (id && recipe.hellofreshId === id) || (url && recipe.sourceUrl === url),
      ) ?? null
    );
  }

  async function paste() {
    try {
      setLink(await navigator.clipboard.readText());
      reset();
    } catch {
      setMessage(strings.add.pasteDenied);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    reset();
    const url = extractUrl(link);
    if (!url) {
      setMessage(strings.add.noLink);
      return;
    }
    // Évite un import inutile quand l'identifiant du lien est déjà connu.
    const known = findExisting(hellofreshIdInUrl(url), url);
    if (known) {
      setDuplicate(known);
      return;
    }
    importRecipe.mutate(url, {
      onSuccess: (imported) => {
        // Le lien peut rediriger vers une autre recette : on revérifie après l'import.
        const existing = findExisting(imported.hellofreshId, imported.sourceUrl);
        if (existing) {
          setDuplicate(existing);
          return;
        }
        close();
        navigate('/recettes/nouvelle', { state: { imported } });
      },
    });
  }

  const error = message ?? importRecipe.error?.message ?? null;

  return (
    <dialog
      ref={ref}
      className={`${styles.sheet} glass`}
      aria-labelledby="add-sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        // Toucher le voile autour de la feuille la ferme. Le voile et les marges de la
        // feuille ont la même cible (le <dialog>) : on compare donc avec ses bords.
        const box = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom;
        if (event.target === event.currentTarget && outside) close();
      }}
    >
      <span className={styles.grabber} aria-hidden="true" />
      <div className={styles.head}>
        <h2 id="add-sheet-title">{strings.add.title}</h2>
        <GlassButton icon="close" label={strings.add.close} onClick={close} />
      </div>

      <form className={styles.option} onSubmit={handleSubmit} noValidate>
        <div className={styles.optionHead}>
          <span className={styles.icon}>
            <Icon name="external" />
          </span>
          <span className={styles.text}>
            <b>{strings.add.linkTitle}</b>
            <span>{strings.add.linkBody}</span>
          </span>
        </div>
        <div className={styles.linkRow}>
          <input
            id="add-link"
            // Champ texte (et non « url ») : le partage iOS colle une phrase entière,
            // dont on extrait le lien (voir link.ts). Le clavier reste celui des adresses.
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            aria-label={strings.add.linkLabel}
            placeholder={strings.add.linkPlaceholder}
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              reset();
            }}
          />
          {!link && (
            <button type="button" className={styles.paste} onClick={() => void paste()}>
              {strings.add.paste}
            </button>
          )}
        </div>
        <Button type="submit" block disabled={importRecipe.isPending || !link.trim()}>
          {importRecipe.isPending ? strings.add.importing : strings.add.import}
        </Button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {duplicate && (
          <div className={styles.duplicate} role="status">
            <p>{strings.add.duplicate(duplicate.title)}</p>
            <Button
              variant="secondary"
              onClick={() => {
                close();
                navigate(`/recettes/${duplicate.id}`);
              }}
            >
              {strings.add.openExisting}
            </Button>
          </div>
        )}
      </form>

      <button
        type="button"
        className={`${styles.option} ${styles.manual}`}
        onClick={() => {
          close();
          navigate('/recettes/nouvelle');
        }}
      >
        <span className={styles.icon}>
          <Icon name="pencil" />
        </span>
        <span className={styles.text}>
          <b>{strings.add.manualTitle}</b>
          <span>{strings.add.manualBody}</span>
        </span>
        <Icon name="chevron" size={16} />
      </button>
    </dialog>
  );
}
