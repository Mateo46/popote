/**
 * Formulaire de recette : création (/recettes/nouvelle) et modification
 * (/recettes/:id/modifier). Barre d'outils en verre : ✕ pour annuler, ✓ pour enregistrer.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCreateRecipe, useRecipe, useUpdateRecipe, useUploadPhotos } from '../../data/hooks';
import type { Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { GlassButton } from '../../ui/GlassButton';
import { SegmentedControl } from '../../ui/SegmentedControl';
import {
  draftFromRecipe,
  draftToInput,
  emptyDraft,
  emptyIngredient,
  emptyStep,
  nutrientKeys,
  type IngredientDraft,
  type RecipeDraft,
  type StepDraft,
} from './draft';
import { PhotoPicker, type PendingPhoto } from './PhotoPicker';
import styles from './RecipeFormPage.module.css';

const difficultyOptions = [
  { value: '', label: strings.form.difficultyNone },
  { value: '1', label: 'Facile' },
  { value: '2', label: 'Moyen' },
  { value: '3', label: 'Difficile' },
] as const;

/** Écran de modification : attend que la recette soit chargée avant d'initialiser le brouillon. */
export function EditRecipePage() {
  const { id } = useParams();
  const { data: recipe, isPending } = useRecipe(id);
  if (isPending) return null;
  if (!recipe) return <p className={styles.missing}>{strings.detail.notFound}</p>;
  return <RecipeForm recipe={recipe} />;
}

export function NewRecipePage() {
  return <RecipeForm />;
}

function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const navigate = useNavigate();
  const create = useCreateRecipe();
  const update = useUpdateRecipe();
  const upload = useUploadPhotos();
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    recipe ? draftFromRecipe(recipe) : emptyDraft(),
  );
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const saving = create.isPending || update.isPending || upload.isPending;
  const serverError = create.error ?? update.error;

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function updateIngredient(key: string, patch: Partial<IngredientDraft>) {
    set(
      'ingredients',
      draft.ingredients.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function updateStep(key: string, patch: Partial<StepDraft>) {
    set(
      'steps',
      draft.steps.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (saving) return;
    const result = draftToInput(draft, recipe);
    if (!result.ok) {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors([]);

    let id: string;
    try {
      if (recipe) {
        await update.mutateAsync({ id: recipe.id, input: result.input });
        id = recipe.id;
      } else {
        id = await create.mutateAsync(result.input);
      }
    } catch {
      // L'erreur est affichée en haut du formulaire (serverError) : on reste ici.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // La recette est enregistrée : on envoie ensuite les nouvelles photos.
    if (photos.length) {
      try {
        await upload.mutateAsync({
          recipe: { id, coverPhotoId: recipe?.coverPhotoId ?? null },
          files: photos.map((photo) => photo.file),
          kind: 'user',
        });
      } catch {
        // On ne reste pas sur le formulaire (un nouvel enregistrement créerait un doublon) :
        // la fiche signale l'échec et permet de réessayer.
        navigate(`/recettes/${id}`, { replace: true, state: { photoUploadFailed: true } });
        return;
      }
    }

    if (recipe) navigate(-1);
    else navigate(`/recettes/${id}`, { replace: true });
  }

  return (
    <form className={styles.page} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className={styles.edge} aria-hidden="true" />
      <div className={styles.toolbar}>
        <GlassButton icon="close" label={strings.form.cancel} onClick={() => navigate(-1)} />
        <h1 className={styles.heading}>
          {recipe ? strings.form.editTitle : strings.form.newTitle}
        </h1>
        <GlassButton
          icon="check"
          tint
          label={saving ? strings.form.saving : strings.form.save}
          disabled={saving}
          onClick={() => void handleSubmit()}
        />
      </div>

      {upload.isPending && (
        <p className={styles.progress} role="status">
          {strings.form.savingPhotos}
        </p>
      )}

      {(errors.length > 0 || serverError) && (
        <div className={styles.errors} role="alert">
          <p>{strings.form.errorsTitle}</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
            {serverError && <li>{serverError.message}</li>}
          </ul>
        </div>
      )}

      <h2 className={styles.label}>{strings.form.photos}</h2>
      <PhotoPicker
        existing={recipe?.photos ?? []}
        pending={photos}
        onChange={setPhotos}
        disabled={saving}
      />
      <p className={styles.hint}>
        {recipe?.photos.length ? strings.form.photosHintEdit : strings.form.photosHintNew}
      </p>

      <h2 className={styles.label}>{strings.form.general}</h2>
      <div className={styles.group}>
        <Field id="f-title" label={strings.form.title}>
          <input
            id="f-title"
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            autoCapitalize="sentences"
            required
          />
        </Field>
        <Field id="f-subtitle" label={strings.form.subtitle}>
          <input
            id="f-subtitle"
            value={draft.subtitle}
            onChange={(e) => set('subtitle', e.target.value)}
          />
        </Field>
        <Field id="f-minutes" label={strings.form.duration}>
          <input
            id="f-minutes"
            inputMode="numeric"
            value={draft.minutes}
            onChange={(e) => set('minutes', e.target.value)}
          />
        </Field>
        <Field id="f-servings" label={strings.form.servings}>
          <input
            id="f-servings"
            inputMode="numeric"
            value={draft.servings}
            onChange={(e) => set('servings', e.target.value)}
          />
        </Field>
        <Field id="f-tags" label={strings.form.tags}>
          <input
            id="f-tags"
            value={draft.tags}
            placeholder={strings.form.tagsHint}
            onChange={(e) => set('tags', e.target.value)}
          />
        </Field>
        <div className={styles.stacked}>
          <label htmlFor="f-description">{strings.form.description}</label>
          <textarea
            id="f-description"
            rows={3}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
      </div>

      <h2 className={styles.label}>{strings.form.difficulty}</h2>
      <div className={styles.inset}>
        <SegmentedControl
          label={strings.form.difficulty}
          options={difficultyOptions}
          value={draft.difficulty}
          onChange={(value) => set('difficulty', value)}
        />
      </div>

      <h2 className={styles.label}>{strings.form.ingredients}</h2>
      <div className={styles.group}>
        {draft.ingredients.map((row) => (
          <div key={row.key} className={styles.ingredient}>
            <div className={styles.ingredientLine}>
              <input
                aria-label={strings.form.ingredientName}
                placeholder={strings.form.ingredientName}
                className={styles.grow}
                value={row.name}
                onChange={(e) => updateIngredient(row.key, { name: e.target.value })}
              />
              <button
                type="button"
                className={styles.remove}
                aria-label={strings.form.removeIngredient(row.name)}
                onClick={() =>
                  set(
                    'ingredients',
                    draft.ingredients.filter((other) => other.key !== row.key),
                  )
                }
              >
                −
              </button>
            </div>
            <div className={styles.ingredientLine}>
              <input
                aria-label={strings.form.ingredientQuantity}
                placeholder={strings.form.ingredientQuantity}
                inputMode="decimal"
                className={styles.quantity}
                value={row.quantity}
                onChange={(e) => updateIngredient(row.key, { quantity: e.target.value })}
              />
              <input
                aria-label={strings.form.ingredientUnit}
                placeholder={strings.form.ingredientUnit}
                className={styles.unit}
                value={row.unit}
                onChange={(e) => updateIngredient(row.key, { unit: e.target.value })}
              />
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={row.shipped === false}
                onClick={() =>
                  updateIngredient(row.key, { shipped: row.shipped === false ? null : false })
                }
              >
                {strings.form.ingredientPantry}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addLine}
          onClick={() => set('ingredients', [...draft.ingredients, emptyIngredient()])}
        >
          + {strings.form.addIngredient}
        </button>
      </div>

      <h2 className={styles.label}>{strings.form.steps}</h2>
      <div className={styles.group}>
        {draft.steps.map((row, index) => (
          <div key={row.key} className={styles.step}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <textarea
              aria-label={strings.form.stepPlaceholder(index + 1)}
              placeholder={strings.form.stepPlaceholder(index + 1)}
              rows={3}
              value={row.text}
              onChange={(e) => updateStep(row.key, { text: e.target.value })}
            />
            <button
              type="button"
              className={styles.remove}
              aria-label={strings.form.removeStep(index + 1)}
              onClick={() =>
                set(
                  'steps',
                  draft.steps.filter((other) => other.key !== row.key),
                )
              }
            >
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.addLine}
          onClick={() => set('steps', [...draft.steps, emptyStep()])}
        >
          + {strings.form.addStep}
        </button>
      </div>

      <h2 className={styles.label}>{strings.form.nutrition}</h2>
      <div className={styles.group}>
        {nutrientKeys.map((key) => (
          <Field key={key} id={`f-${key}`} label={strings.nutrients[key]}>
            <input
              id={`f-${key}`}
              inputMode="decimal"
              className={styles.number}
              value={draft.nutrition[key]}
              onChange={(e) => set('nutrition', { ...draft.nutrition, [key]: e.target.value })}
            />
            <span className={styles.suffix}>{key === 'kcal' ? 'kcal' : 'g'}</span>
          </Field>
        ))}
      </div>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
