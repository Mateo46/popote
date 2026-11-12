/**
 * Brouillon du formulaire de recette : tout est en texte, comme dans les champs, puis
 * converti et validé en `RecipeInput` à l'enregistrement.
 *
 * Ce module servira aussi d'écran de relecture pour les imports (lien HelloFresh, scan).
 */
import { normalizeName } from '../../domain/normalize';
import {
  ingredientSchema,
  stepSchema,
  type NutrientKey,
  type Recipe,
  type RecipeInput,
} from '../../domain/recipe';

export const nutrientKeys: NutrientKey[] = [
  'kcal',
  'fat',
  'saturated_fat',
  'carbs',
  'sugars',
  'fiber',
  'protein',
  'salt',
];

export interface IngredientDraft {
  /** Clé stable pour React (les lignes peuvent être ajoutées ou retirées). */
  key: string;
  quantity: string;
  unit: string;
  name: string;
  /** `false` = à avoir chez soi ; `true` = livré ; `null` = non précisé. */
  shipped: boolean | null;
}

export interface StepDraft {
  key: string;
  text: string;
  imagePath: string | null;
}

export interface RecipeDraft {
  title: string;
  subtitle: string;
  description: string;
  minutes: string;
  servings: string;
  difficulty: '' | '1' | '2' | '3';
  tags: string;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
  nutrition: Record<NutrientKey, string>;
  servingGrams: string;
}

let nextKey = 0;
/** Identifiant local d'une ligne de formulaire. */
export const newKey = () => `k${++nextKey}`;

export const emptyIngredient = (): IngredientDraft => ({
  key: newKey(),
  quantity: '',
  unit: '',
  name: '',
  shipped: null,
});

export const emptyStep = (): StepDraft => ({ key: newKey(), text: '', imagePath: null });

const emptyNutrition = () =>
  Object.fromEntries(nutrientKeys.map((key) => [key, ''])) as Record<NutrientKey, string>;

export function emptyDraft(): RecipeDraft {
  return {
    title: '',
    subtitle: '',
    description: '',
    minutes: '',
    servings: '2',
    difficulty: '',
    tags: '',
    ingredients: [emptyIngredient()],
    steps: [emptyStep()],
    nutrition: emptyNutrition(),
    servingGrams: '',
  };
}

const numberText = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value).replace('.', ',');

export function draftFromRecipe(recipe: Recipe): RecipeDraft {
  const minutes = Math.max(recipe.prepMinutes ?? 0, recipe.totalMinutes ?? 0);
  const nutrition = emptyNutrition();
  for (const key of nutrientKeys) nutrition[key] = numberText(recipe.nutrition?.[key]);
  return {
    title: recipe.title,
    subtitle: recipe.subtitle ?? '',
    description: recipe.description ?? '',
    minutes: minutes ? String(minutes) : '',
    servings: numberText(recipe.servings),
    difficulty: recipe.difficulty ? (String(recipe.difficulty) as '1' | '2' | '3') : '',
    tags: recipe.tags.join(', '),
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((ingredient) => ({
          key: newKey(),
          // « selon le goût » est stocké en unité avec une quantité nulle (format HelloFresh).
          quantity: ingredient.quantity
            ? numberText(Math.round(ingredient.quantity * 100) / 100)
            : '',
          unit: ingredient.unit ?? '',
          name: ingredient.name,
          shipped: ingredient.shipped,
        }))
      : [emptyIngredient()],
    steps: recipe.steps.length
      ? recipe.steps.map((step) => ({ key: newKey(), text: step.text, imagePath: step.image_path }))
      : [emptyStep()],
    nutrition,
    servingGrams: numberText(recipe.nutrition?.serving_grams),
  };
}

const fractionChars: Record<string, number> = {
  '¼': 0.25,
  '⅓': 1 / 3,
  '½': 0.5,
  '⅔': 2 / 3,
  '¾': 0.75,
};

/**
 * Lit un nombre saisi : « 2 », « 1,5 », « 1.5 », « ½ », « 1½ », « 1/2 ».
 * Renvoie `null` pour un champ vide, `NaN` si la saisie n'est pas un nombre.
 */
export function parseAmount(text: string): number | null {
  const value = text.trim().replace(',', '.');
  if (!value) return null;
  const unicode = /^(\d*)\s*([¼⅓½⅔¾])$/.exec(value);
  if (unicode) return Number(unicode[1] || 0) + (fractionChars[unicode[2] ?? ''] ?? 0);
  const slash = /^(\d+)\s*\/\s*(\d+)$/.exec(value);
  if (slash) return Number(slash[2]) ? Number(slash[1]) / Number(slash[2]) : NaN;
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
}

export type DraftResult = { ok: true; input: RecipeInput } | { ok: false; errors: string[] };

/**
 * Convertit le brouillon. Les lignes d'ingrédient et d'étape vides sont ignorées.
 * `base` : recette modifiée, dont on conserve la source et les données importées.
 */
export function draftToInput(draft: RecipeDraft, base?: Recipe): DraftResult {
  const errors: string[] = [];

  const title = draft.title.trim();
  if (!title) errors.push('Le titre est obligatoire.');

  const wholeNumber = (text: string, label: string) => {
    const value = parseAmount(text);
    if (value === null) return null;
    if (Number.isNaN(value) || !Number.isInteger(value) || value < 0) {
      errors.push(`${label} : nombre entier attendu.`);
      return null;
    }
    return value;
  };
  const minutes = wholeNumber(draft.minutes, 'Durée');
  const servings = wholeNumber(draft.servings, 'Personnes');
  if (servings === 0) errors.push('Personnes : au moins 1.');

  const ingredients = draft.ingredients
    .filter((row) => row.name.trim() || row.quantity.trim())
    .map((row) => {
      const quantity = parseAmount(row.quantity);
      if (!row.name.trim()) errors.push(`Ingrédient sans nom (quantité « ${row.quantity} »).`);
      if (quantity !== null && Number.isNaN(quantity)) {
        errors.push(`« ${row.name} » : quantité « ${row.quantity} » illisible.`);
      }
      return ingredientSchema.parse({
        name: row.name.trim() || '?',
        normalized: normalizeName(row.name),
        quantity: quantity === null || Number.isNaN(quantity) ? null : quantity,
        unit: row.unit.trim() || null,
        shipped: row.shipped,
      });
    });

  const steps = draft.steps
    .filter((row) => row.text.trim())
    .map((row) => stepSchema.parse({ text: row.text.trim(), image_path: row.imagePath }));

  const nutrition: Partial<Record<NutrientKey | 'serving_grams', number>> = {};
  for (const key of [...nutrientKeys, 'serving_grams'] as const) {
    const text = key === 'serving_grams' ? draft.servingGrams : draft.nutrition[key];
    const value = parseAmount(text);
    if (value === null) continue;
    if (Number.isNaN(value)) errors.push(`Valeur nutritionnelle « ${text} » illisible.`);
    else nutrition[key] = value;
  }

  if (errors.length) return { ok: false, errors };

  const tags = draft.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    ok: true,
    input: {
      title,
      subtitle: draft.subtitle.trim() || null,
      description: draft.description.trim() || null,
      source: base?.source ?? 'manual',
      sourceUrl: base?.sourceUrl ?? null,
      hellofreshId: base?.hellofreshId ?? null,
      // Une seule durée dans le formulaire : elle remplace les deux valeurs importées.
      prepMinutes: null,
      totalMinutes: minutes,
      difficulty: draft.difficulty ? (Number(draft.difficulty) as 1 | 2 | 3) : null,
      servings,
      tags: [...new Set(tags)],
      allergens: base?.allergens ?? [],
      utensils: base?.utensils ?? [],
      ingredients,
      steps,
      nutrition: Object.keys(nutrition).length ? nutrition : null,
    },
  };
}
