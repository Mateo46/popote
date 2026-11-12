/**
 * Rapprochement des noms d'ingrédients, pour la recherche et « Mon frigo ».
 *
 * « Échalotes », « échalote » et « 1 échalote ciselée » doivent désigner la même chose.
 * On calcule une clé d'ingrédient (`ingredientKey`) : nom normalisé, au singulier, sans
 * qualificatifs de préparation, avec quelques synonymes propres aux recettes HelloFresh.
 *
 * Les clés sont recalculées à partir des libellés à chaque utilisation : changer ces
 * règles ne demande aucune migration de données.
 */
import { normalizeName } from './normalize';

/**
 * Mots qui décrivent la préparation ou la présentation, pas l'ingrédient lui-même.
 * Au singulier : ils sont comparés après mise au singulier.
 */
const qualifiers = new Set([
  'frais',
  'fraiche',
  'hache',
  'hachee',
  'emince',
  'emincee',
  'cisele',
  'ciselee',
  'moulu',
  'moulue',
  'concasse',
  'concassee',
  'rape',
  'rapee',
  'seche',
  'sechee',
  'mini',
  'bio',
  'non',
  'sale',
  'salee',
  'en',
  'poudre',
  'sachet',
]);

/** Mots invariables dont le « s » ou le « x » final n'est pas un pluriel. */
const invariable = new Set([
  'pois',
  'radis',
  'anchois',
  'mais',
  'noix',
  'riz',
  'jus',
  'ananas',
  'cassis',
  'gras',
  'frais',
  'lardons',
  'tapas',
  'couscous',
  'brebis',
]);

/** Synonymes : clé obtenue → clé de référence. */
const synonyms: Record<string, string> = {
  'gousse d ail': 'ail',
  'tete d ail': 'ail',
  'gousse ail': 'ail',
  'blanc de poulet': 'poulet',
  'filet de poulet': 'poulet',
  'emince de poulet': 'poulet',
  'cuisse de poulet': 'poulet',
  'emince de boeuf': 'boeuf',
  'viande de boeuf': 'boeuf',
  'viande hachee au boeuf': 'boeuf hache',
  'viande au boeuf': 'boeuf hache',
  'steak hache': 'boeuf hache',
  'citron jaune': 'citron',
  grenaille: 'pomme de terre',
  mesclun: 'salade',
  'roquette et mache': 'salade',
  'persil plat': 'persil',
  'coriandre fraiche': 'coriandre',
  'yaourt a la grecque': 'yaourt grec',
  'creme fraiche': 'creme',
  'creme fraiche epaisse': 'creme',
  'creme liquide': 'creme',
};

function singular(word: string): string {
  if (word.length <= 3 || invariable.has(word)) return word;
  if (/(eau|eu|ou)x$/.test(word)) return word.slice(0, -1); // poireaux, choux
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Clé d'un ingrédient : « 2 Échalotes ciselées » → « echalote » ;
 * « Viande hachée au bœuf » → « boeuf hache » ; « Gousse d'ail » → « ail ».
 */
export function ingredientKey(name: string): string {
  const words = normalizeName(name)
    .split(' ')
    .filter((word) => word && !/^\d+$/.test(word));
  // Les synonymes sont cherchés avant et après le retrait des qualificatifs.
  const singularWords = words.map(singular);
  const raw = singularWords.join(' ');
  if (synonyms[raw]) return synonyms[raw];
  const key = singularWords.filter((word) => !qualifiers.has(word)).join(' ');
  return synonyms[key] ?? key;
}

/**
 * Un ingrédient de recette correspond-il à un ingrédient disponible ?
 * Oui si les clés sont égales, ou si la clé de la recette commence par celle du frigo
 * (« persil » couvre « persil plat », « huile d olive » couvre « huile d olive vierge »).
 */
export function keyMatches(recipeKey: string, availableKey: string): boolean {
  if (!availableKey) return false;
  return recipeKey === availableKey || recipeKey.startsWith(`${availableKey} `);
}

/**
 * Découpe les libellés composés en ingrédients distincts : « Poivre et sel » → poivre, sel.
 */
export function splitCompound(key: string): string[] {
  return key.split(/ (?:et|ou) /).filter(Boolean);
}
