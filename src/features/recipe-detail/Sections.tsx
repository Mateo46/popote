/** Sections de la fiche recette : ingrédients, étapes, nutrition, historique. */
import { useDeleteCookEntry } from '../../data/hooks';
import { formatDecimal, formatLongDate, formatQuantity } from '../../domain/format';
import { splitIngredients, type NutrientKey, type Recipe, type Step } from '../../domain/recipe';
import { strings } from '../../strings';
import { Icon } from '../../ui/Icon';
import { PhotoImage } from '../../ui/PhotoImage';
import styles from './detail.module.css';

export function IngredientsSection({ recipe }: { recipe: Recipe }) {
  if (!recipe.ingredients.length) return null;
  const { main, pantry } = splitIngredients(recipe.ingredients);

  const rows = (list: typeof main) =>
    list.map((ingredient, index) => (
      <li key={`${ingredient.normalized}-${index}`} className={styles.row}>
        <span className={styles.rowMain}>{ingredient.name}</span>
        <span className={styles.rowValue}>
          {formatQuantity(ingredient.quantity, ingredient.unit)}
        </span>
      </li>
    ));

  return (
    <>
      {main.length > 0 && (
        <section>
          <h2 className={styles.sectionLabel}>
            {strings.detail.ingredients}
            {recipe.servings && <em>{strings.detail.forServings(recipe.servings)}</em>}
          </h2>
          <ul className={styles.group}>{rows(main)}</ul>
        </section>
      )}
      {pantry.length > 0 && (
        <section>
          <h2 className={styles.sectionLabel}>{strings.detail.pantry}</h2>
          <ul className={styles.group}>{rows(pantry)}</ul>
        </section>
      )}
    </>
  );
}

export function StepsSection({
  steps,
  urls,
}: {
  steps: Step[];
  urls: Record<string, string> | undefined;
}) {
  if (!steps.length) return null;
  return (
    <section>
      <h2 className={styles.sectionLabel}>{strings.detail.steps}</h2>
      <ol className={styles.group}>
        {steps.map((step, index) => (
          <li key={index} className={styles.step}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <p>{step.text}</p>
            {step.image_path && (
              <PhotoImage src={urls?.[step.image_path]} className={styles.stepImage} />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Ordre d'affichage ; les « dont … » sont en retrait sous leur parent. */
const nutrientRows: { key: NutrientKey; unit: string; sub?: boolean }[] = [
  { key: 'kcal', unit: 'kcal' },
  { key: 'fat', unit: 'g' },
  { key: 'saturated_fat', unit: 'g', sub: true },
  { key: 'carbs', unit: 'g' },
  { key: 'sugars', unit: 'g', sub: true },
  { key: 'fiber', unit: 'g' },
  { key: 'protein', unit: 'g' },
  { key: 'salt', unit: 'g' },
];

export function NutritionSection({ recipe }: { recipe: Recipe }) {
  const nutrition = recipe.nutrition;
  const rows = nutrientRows.filter(({ key }) => typeof nutrition?.[key] === 'number');
  if (!nutrition || !rows.length) {
    return recipe.allergens.length ? (
      <p className={styles.note}>
        {strings.detail.allergens(recipe.allergens.join(', ').toLowerCase())}
      </p>
    ) : null;
  }

  return (
    <section>
      <h2 className={styles.sectionLabel}>
        {strings.detail.nutrition}
        <em>{strings.detail.perServing(nutrition.serving_grams ?? null)}</em>
      </h2>
      <ul className={styles.group}>
        {rows.map(({ key, unit, sub }) => (
          <li key={key} className={sub ? `${styles.row} ${styles.subRow}` : styles.row}>
            <span className={styles.rowMain}>{strings.nutrients[key]}</span>
            <span className={styles.rowValue}>
              {formatDecimal(nutrition[key] ?? 0)} {unit}
            </span>
          </li>
        ))}
      </ul>
      {recipe.allergens.length > 0 && (
        <p className={styles.note}>
          {strings.detail.allergens(recipe.allergens.join(', ').toLowerCase())}
        </p>
      )}
    </section>
  );
}

export function HistorySection({ recipe }: { recipe: Recipe }) {
  const deleteEntry = useDeleteCookEntry();
  if (!recipe.cookLog.length) return null;
  return (
    <section>
      <h2 className={styles.sectionLabel}>{strings.detail.history}</h2>
      <ul className={styles.group}>
        {recipe.cookLog.map((entry) => (
          <li key={entry.id} className={styles.row}>
            <span className={styles.rowMain}>{formatLongDate(entry.cookedOn)}</span>
            <button
              type="button"
              className={styles.rowAction}
              aria-label={`${strings.detail.removeEntry} : ${formatLongDate(entry.cookedOn)}`}
              disabled={deleteEntry.isPending}
              onClick={() => deleteEntry.mutate(entry.id)}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
