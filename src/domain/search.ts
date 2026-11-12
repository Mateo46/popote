/**
 * Recherche dans les recettes, entièrement en mémoire (quelques centaines au plus).
 *
 * Chaque mot cherché doit apparaître au début d'un mot du titre, du sous-titre, d'un
 * ingrédient ou d'un tag, sans tenir compte des accents, de la casse ni du pluriel :
 * « tomates » trouve « Tomate », « bav » trouve « Bavette ».
 */
import { ingredientKey } from './ingredients';
import { normalizeName } from './normalize';
import { durationMinutes, type Recipe } from './recipe';

export interface SearchFilters {
  /** Note minimale (incluse). */
  minRating: number | null;
  /** Durée maximale en minutes (incluse). */
  maxMinutes: number | null;
  neverCooked: boolean;
  notRated: boolean;
  /** Tags exigés (tous). */
  tags: string[];
}

export const noFilters: SearchFilters = {
  minRating: null,
  maxMinutes: null,
  neverCooked: false,
  notRated: false,
  tags: [],
};

export type MatchField = 'title' | 'subtitle' | 'ingredient' | 'tag';

export interface SearchHit<R> {
  recipe: R;
  /** Où la recherche a trouvé la recette, pour l'expliquer dans la liste. */
  field: MatchField;
  /** Ingrédient ou tag trouvé (si `field` vaut « ingredient » ou « tag »). */
  matched: string | null;
}

type SearchableRecipe = Pick<
  Recipe,
  | 'title'
  | 'subtitle'
  | 'tags'
  | 'ingredients'
  | 'rating'
  | 'prepMinutes'
  | 'totalMinutes'
  | 'cookLog'
>;

/** Mots normalisés de la recherche (« Tomates cerises » → tomate, cerise). */
export function queryTokens(query: string): string[] {
  return normalizeName(query)
    .split(' ')
    .filter(Boolean)
    .map((word) => ingredientKey(word) || word);
}

/** Mots normalisés d'un texte. */
const wordsOf = (text: string) => normalizeName(text).split(' ').filter(Boolean);

/** Vrai si chaque mot cherché commence un des mots. */
const containsAll = (words: string[], tokens: string[]) =>
  tokens.every((token) => words.some((word) => word.startsWith(token)));

/** Vrai si au moins un mot cherché commence un des mots. */
const containsAny = (words: string[], tokens: string[]) =>
  tokens.some((token) => words.some((word) => word.startsWith(token)));

interface RecipeIndex {
  title: string[];
  subtitle: string[];
  ingredients: string[][];
  tags: string[][];
  all: string[];
}

/**
 * Mots normalisés de chaque recette, calculés une fois puis réutilisés à chaque frappe.
 * Clé faible : l'index disparaît avec l'objet recette (nouvelle version après une
 * modification).
 */
const indexCache = new WeakMap<SearchableRecipe, RecipeIndex>();

function indexOf(recipe: SearchableRecipe): RecipeIndex {
  let index = indexCache.get(recipe);
  if (!index) {
    const title = wordsOf(recipe.title);
    const subtitle = wordsOf(recipe.subtitle ?? '');
    const ingredients = recipe.ingredients.map((ingredient) => wordsOf(ingredient.name));
    const tags = recipe.tags.map(wordsOf);
    index = {
      title,
      subtitle,
      ingredients,
      tags,
      all: [title, subtitle, ...ingredients, ...tags].flat(),
    };
    indexCache.set(recipe, index);
  }
  return index;
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.minRating !== null ||
    filters.maxMinutes !== null ||
    filters.neverCooked ||
    filters.notRated ||
    filters.tags.length > 0
  );
}

function passesFilters(recipe: SearchableRecipe, filters: SearchFilters): boolean {
  if (filters.minRating !== null && (recipe.rating ?? -1) < filters.minRating) return false;
  if (filters.maxMinutes !== null) {
    const minutes = durationMinutes(recipe);
    if (minutes === null || minutes > filters.maxMinutes) return false;
  }
  if (filters.neverCooked && recipe.cookLog.length > 0) return false;
  if (filters.notRated && recipe.rating !== null) return false;
  return filters.tags.every((tag) => recipe.tags.includes(tag));
}

const fieldRank: Record<MatchField, number> = { title: 0, subtitle: 1, ingredient: 2, tag: 3 };

/** Où se trouve la correspondance la plus parlante ; `null` si un mot manque. */
function locate(index: RecipeIndex, tokens: string[]): MatchField | null {
  if (!containsAll(index.all, tokens)) return null;
  if (containsAll(index.title, tokens)) return 'title';
  if (containsAny(index.subtitle, tokens)) return 'subtitle';
  if (containsAny(index.title, tokens)) return 'title';
  if (index.ingredients.some((words) => containsAny(words, tokens))) return 'ingredient';
  return 'tag';
}

/**
 * Recettes correspondant à la recherche et aux filtres.
 * Sans texte ni filtre, renvoie une liste vide (l'écran affiche les recherches récentes).
 * Tri : correspondance dans le titre d'abord, puis sous-titre, ingrédient, tag ; puis note.
 */
export function searchRecipes<R extends SearchableRecipe>(
  recipes: readonly R[],
  query: string,
  filters: SearchFilters,
): SearchHit<R>[] {
  const tokens = queryTokens(query);
  if (!tokens.length && !hasActiveFilters(filters)) return [];

  const hits: SearchHit<R>[] = [];
  for (const recipe of recipes) {
    if (!passesFilters(recipe, filters)) continue;
    if (!tokens.length) {
      hits.push({ recipe, field: 'title', matched: null });
      continue;
    }
    const index = indexOf(recipe);
    const field = locate(index, tokens);
    if (!field) continue;
    const matched =
      field === 'ingredient'
        ? (recipe.ingredients[index.ingredients.findIndex((w) => containsAny(w, tokens))]?.name ??
          null)
        : field === 'tag'
          ? (recipe.tags[index.tags.findIndex((w) => containsAny(w, tokens))] ?? null)
          : null;
    hits.push({ recipe, field, matched });
  }

  return hits.sort(
    (a, b) =>
      fieldRank[a.field] - fieldRank[b.field] ||
      (b.recipe.rating ?? -1) - (a.recipe.rating ?? -1) ||
      a.recipe.title.localeCompare(b.recipe.title, 'fr'),
  );
}

/** Tags les plus fréquents, pour proposer des filtres rapides. */
export function topTags(recipes: readonly Pick<Recipe, 'tags'>[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    for (const tag of recipe.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, limit)
    .map(([tag]) => tag);
}
