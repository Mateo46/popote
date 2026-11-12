/**
 * Fiche d'une recette : photo, chiffres clés, note et commentaire, « Cuisinée aujourd'hui »,
 * ingrédients, étapes, nutrition, photos et historique.
 *
 * Les boutons Retour et « … » flottent en Liquid Glass au-dessus du contenu.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useDeleteRecipe, usePhotoUrls, useRecipe } from '../../data/hooks';
import { thumbPath } from '../../data/images';
import { formatMinutes } from '../../domain/format';
import { coverPhoto, difficultyLabels, durationMinutes } from '../../domain/recipe';
import { strings } from '../../strings';
import { ActionMenu } from '../../ui/ActionMenu';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { GlassButton } from '../../ui/GlassButton';
import { Icon } from '../../ui/Icon';
import { PhotoImage } from '../../ui/PhotoImage';
import { PhotoGallery } from './PhotoGallery';
import { RatingCard } from './RatingCard';
import { HistorySection, IngredientsSection, NutritionSection, StepsSection } from './Sections';
import styles from './detail.module.css';

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recipe, isPending } = useRecipe(id);
  const deleteRecipe = useDeleteRecipe();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cover = recipe ? coverPhoto(recipe) : null;
  const paths = recipe
    ? [
        ...(cover ? [cover.path] : []),
        ...recipe.photos.map((photo) => thumbPath(photo.path)),
        ...recipe.steps.flatMap((step) => (step.image_path ? [step.image_path] : [])),
      ]
    : [];
  const { data: urls } = usePhotoUrls(paths);

  const goBack = () => navigate(-1);

  if (isPending) return null;
  if (!recipe) {
    return (
      <main className={styles.missing}>
        <p>{strings.detail.notFound}</p>
        <Link to="/">{strings.notFound.back}</Link>
      </main>
    );
  }

  const minutes = durationMinutes(recipe);
  const kcal = recipe.nutrition?.kcal;

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <GlassButton icon="back" label={strings.detail.back} onClick={goBack} />
        <ActionMenu
          label={strings.detail.more}
          actions={[
            {
              label: strings.detail.edit,
              icon: 'pencil',
              onSelect: () => navigate(`/recettes/${recipe.id}/modifier`),
            },
            {
              label: strings.detail.delete,
              icon: 'trash',
              danger: true,
              onSelect: () => setConfirmDelete(true),
            },
          ]}
        />
      </div>

      {cover ? (
        <PhotoImage src={urls?.[cover.path]} alt={recipe.title} className={styles.hero} />
      ) : (
        <div className={styles.heroSpacer} />
      )}

      <section className={styles.titleBlock}>
        <h1 className={styles.title}>{recipe.title}</h1>
        {recipe.subtitle && <p className={styles.subtitle}>{recipe.subtitle}</p>}
        <dl className={styles.stats}>
          <div>
            <dt>{strings.detail.duration}</dt>
            <dd>{minutes !== null ? formatMinutes(minutes) : '–'}</dd>
          </div>
          <div>
            <dt>{strings.detail.difficulty}</dt>
            <dd>{recipe.difficulty ? difficultyLabels[recipe.difficulty] : '–'}</dd>
          </div>
          <div>
            <dt>{strings.detail.kcal}</dt>
            <dd>{kcal ? Math.round(kcal) : '–'}</dd>
          </div>
          <div>
            <dt>{strings.detail.servings}</dt>
            <dd>{recipe.servings ?? '–'}</dd>
          </div>
        </dl>
      </section>

      <RatingCard recipe={recipe} />
      {recipe.description && <p className={styles.description}>{recipe.description}</p>}
      <IngredientsSection recipe={recipe} />
      <StepsSection steps={recipe.steps} urls={urls} />
      <NutritionSection recipe={recipe} />
      <PhotoGallery recipe={recipe} urls={urls} />
      <HistorySection recipe={recipe} />

      {recipe.sourceUrl && (
        <a className={styles.source} href={recipe.sourceUrl} target="_blank" rel="noreferrer">
          <Icon name="external" size={16} />
          {strings.detail.source}
        </a>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={strings.detail.deleteTitle}
        message={strings.detail.deleteMessage}
        confirmLabel={strings.detail.deleteConfirm}
        busy={deleteRecipe.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteRecipe.mutate(recipe, { onSuccess: () => navigate('/', { replace: true }) })
        }
      />
    </main>
  );
}
