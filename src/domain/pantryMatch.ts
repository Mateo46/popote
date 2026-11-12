/**
 * Score « Mon frigo » : quelles recettes peut-on faire avec ce qu'on a ?
 *
 * Pour chaque recette : ingrédients possédés / ingrédients requis. Les basiques (sel,
 * poivre, huiles…) sont exclus du calcul : ni requis, ni comptés comme manquants.
 * Les œufs ne sont pas des basiques : ils comptent.
 */
import { ingredientKey, keyMatches, splitCompound } from './ingredients';
import type { Recipe } from './recipe';

type MatchableRecipe = Pick<Recipe, 'id' | 'title' | 'rating' | 'ingredients'>;

export interface PantryMatch<R extends MatchableRecipe> {
  recipe: R;
  /** Ingrédients requis (hors basiques) que l'on a. */
  owned: number;
  /** Ingrédients requis, hors basiques. */
  required: number;
  /** Noms des ingrédients manquants, dans l'ordre de la recette. */
  missing: string[];
}

function covers(available: string[], key: string): boolean {
  return available.some((availableKey) => keyMatches(key, availableKey));
}

/**
 * Classe les recettes par part d'ingrédients disponibles (puis par nombre, puis par note).
 * Les recettes dont on n'a aucun ingrédient ne sont pas renvoyées.
 *
 * @param availableLabels contenu de « Mon frigo » (libellés saisis)
 * @param stapleLabels basiques toujours disponibles
 */
export function matchPantry<R extends MatchableRecipe>(
  recipes: readonly R[],
  availableLabels: readonly string[],
  stapleLabels: readonly string[],
): PantryMatch<R>[] {
  const available = availableLabels.map(ingredientKey).filter(Boolean);
  const staples = stapleLabels.map(ingredientKey).filter(Boolean);
  if (!available.length) return [];

  const matches: PantryMatch<R>[] = [];
  for (const recipe of recipes) {
    const seen = new Set<string>();
    let owned = 0;
    let required = 0;
    const missing: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const key = ingredientKey(ingredient.name);
      if (!key || seen.has(key)) continue; // même ingrédient listé deux fois
      seen.add(key);
      // « Poivre et sel » : basique seulement si chaque partie en est un.
      const parts = splitCompound(key);
      if (parts.every((part) => covers(staples, part))) continue;
      required += 1;
      if (parts.every((part) => covers(available, part) || covers(staples, part))) owned += 1;
      else missing.push(ingredient.name);
    }

    if (owned > 0) matches.push({ recipe, owned, required, missing });
  }

  return matches.sort(
    (a, b) =>
      b.owned / b.required - a.owned / a.required ||
      b.owned - a.owned ||
      (b.recipe.rating ?? -1) - (a.recipe.rating ?? -1) ||
      a.recipe.title.localeCompare(b.recipe.title, 'fr'),
  );
}

/**
 * Suggestions pour la saisie de « Mon frigo » : ingrédients des recettes dont un mot
 * commence par le texte tapé (« pat » → patate douce), les plus fréquents d'abord.
 * Un libellé par ingrédient.
 *
 * @param exclude clés déjà présentes (frigo, basiques) à ne pas reproposer
 */
export function suggestIngredients(
  recipes: readonly Pick<Recipe, 'ingredients'>[],
  typed: string,
  exclude: ReadonlySet<string>,
  limit = 6,
): string[] {
  const query = ingredientKey(typed);
  if (!query) return [];
  const byKey = new Map<string, { label: string; count: number }>();
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const key = ingredientKey(ingredient.name);
      // Début de mot : on cherche « espace + texte » dans « espace + clé ».
      if (!key || exclude.has(key) || !` ${key}`.includes(` ${query}`)) continue;
      const entry = byKey.get(key);
      if (entry) entry.count += 1;
      else byKey.set(key, { label: ingredient.name, count: 1 });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
    .slice(0, limit)
    .map((entry) => entry.label);
}
