/**
 * Normalisation des noms d'ingrédients, pour comparer « Échalote » et « echalote ».
 *
 * Version de base (phase 4) : minuscules, sans accents ni ponctuation. La phase 5 ajoutera
 * le singulier, les qualificatifs (« frais », « haché ») et les synonymes, utiles à
 * « Mon frigo ». Si ces règles changent, recalculer `pantry_staples.normalized`.
 */
export function normalizeName(name: string): string {
  return (
    name
      .normalize('NFD')
      // Retire les accents (diacritiques combinants) après décomposition.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      // Toute ponctuation (apostrophes, parenthèses, tirets…) devient une espace.
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
}
