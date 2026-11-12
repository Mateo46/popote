/**
 * Tris de la liste des recettes (puces de l'écran Recettes).
 * Les recettes sans valeur pour le critère (non notée, jamais cuisinée…) vont à la fin.
 */
import { durationMinutes, type Recipe } from './recipe';

export const recipeSorts = ['rating', 'recent', 'quick', 'cooked'] as const;
export type RecipeSort = (typeof recipeSorts)[number];

export const recipeSortLabels: Record<RecipeSort, string> = {
  rating: 'Mieux notées',
  recent: 'Récentes',
  quick: 'Rapides',
  cooked: 'Cuisinées récemment',
};

type SortableRecipe = Pick<
  Recipe,
  'title' | 'rating' | 'createdAt' | 'prepMinutes' | 'totalMinutes' | 'cookLog'
>;

const byTitle = (a: SortableRecipe, b: SortableRecipe) =>
  a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });

/** Compare deux valeurs optionnelles ; `null` toujours en dernier. */
function compareNullable<T>(a: T | null, b: T | null, compare: (x: T, y: T) => number): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compare(a, b);
}

const comparators: Record<RecipeSort, (a: SortableRecipe, b: SortableRecipe) => number> = {
  rating: (a, b) => compareNullable(a.rating, b.rating, (x, y) => y - x),
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  quick: (a, b) => compareNullable(durationMinutes(a), durationMinutes(b), (x, y) => x - y),
  cooked: (a, b) =>
    compareNullable(a.cookLog[0]?.cookedOn ?? null, b.cookLog[0]?.cookedOn ?? null, (x, y) =>
      y.localeCompare(x),
    ),
};

/** Renvoie une copie triée ; à égalité, ordre alphabétique. */
export function sortRecipes<T extends SortableRecipe>(
  recipes: readonly T[],
  sort: RecipeSort,
): T[] {
  const compare = comparators[sort];
  return [...recipes].sort((a, b) => compare(a, b) || byTitle(a, b));
}
