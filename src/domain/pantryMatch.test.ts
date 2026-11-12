import { describe, expect, it } from 'vitest';
import { matchPantry, suggestIngredients } from './pantryMatch';
import type { Ingredient } from './recipe';

const ing = (name: string): Ingredient => ({
  name,
  normalized: '',
  quantity: null,
  unit: null,
  shipped: null,
});

function recipe(id: string, names: string[], rating: number | null = null) {
  return { id, title: id, rating, ingredients: names.map(ing) };
}

const staples = [
  'Sel',
  'Poivre',
  "Huile d'olive",
  'Huile de tournesol',
  'Beurre',
  'Sucre',
  'Farine',
  'Vinaigre',
  'Eau',
];

const chimichurri = recipe('Bavette chimichurri', [
  'Patate douce',
  "Gousse d'ail",
  'Échalote',
  'Piment',
  'Persil',
  'Bavette de bœuf',
  'Paprika fumé en poudre',
  'Salade',
  "Huile d'olive",
  'Beurre',
  'Vinaigre balsamique noir',
  'Poivre et sel',
]);

describe('matchPantry', () => {
  it('compte les ingrédients possédés, hors basiques, et liste ceux qui manquent', () => {
    const [match] = matchPantry(
      [chimichurri],
      ['Bavette de bœuf', 'Patates douces', 'Ail', 'Échalotes', 'Persil plat', 'Salade'],
      staples,
    );
    expect(match).toMatchObject({
      owned: 6,
      required: 8,
      missing: ['Piment', 'Paprika fumé en poudre'],
    });
  });

  it('ne considère pas les œufs comme un basique', () => {
    const [match] = matchPantry(
      [recipe('Omelette', ['Œuf', 'Sel', 'Ciboulette'])],
      ['ciboulette'],
      staples,
    );
    expect(match).toMatchObject({ owned: 1, required: 2, missing: ['Œuf'] });
  });

  it('les œufs du frigo comptent', () => {
    const [match] = matchPantry([recipe('Omelette', ['Œuf', 'Sel'])], ['oeufs'], staples);
    expect(match).toMatchObject({ owned: 1, required: 1, missing: [] });
  });

  it('classe par proportion puis par nombre puis par note', () => {
    const results = matchPantry(
      [
        recipe('A', ['Riz', 'Carotte', 'Poulet', 'Avocat']), // 2/4
        recipe('B', ['Riz', 'Carotte']), // 2/2
        recipe('C', ['Riz', 'Poireau'], 5), // 1/2
        recipe('D', ['Riz', 'Navet'], 3), // 1/2
        recipe('E', ['Courgette']), // 0 : absente
      ],
      ['riz', 'carottes'],
      staples,
    );
    expect(results.map((r) => r.recipe.id)).toEqual(['B', 'A', 'C', 'D']);
  });

  it('renvoie une liste vide quand le frigo est vide', () => {
    expect(matchPantry([chimichurri], [], staples)).toEqual([]);
  });

  it('ignore un ingrédient listé deux fois', () => {
    const [match] = matchPantry([recipe('X', ['Ail', "Gousse d'ail", 'Oignon'])], ['ail'], staples);
    expect(match).toMatchObject({ owned: 1, required: 2 });
  });
});

describe('suggestIngredients', () => {
  const recipes = [
    recipe('A', ['Patate douce', 'Persil plat', 'Pâtes']),
    recipe('B', ['Patates douces', 'Ail']),
    recipe('C', ['Persil']),
  ];

  it('propose les ingrédients dont un mot commence par la saisie, les plus fréquents d’abord', () => {
    expect(suggestIngredients(recipes, 'pat', new Set())).toEqual(['Patate douce', 'Pâtes']);
    expect(suggestIngredients(recipes, 'douce', new Set())).toEqual(['Patate douce']);
  });

  it('regroupe les variantes et exclut ce qui est déjà dans le frigo', () => {
    expect(suggestIngredients(recipes, 'pers', new Set())).toEqual(['Persil plat']);
    expect(suggestIngredients(recipes, 'pers', new Set(['persil']))).toEqual([]);
  });

  it('ne propose rien sans saisie', () => {
    expect(suggestIngredients(recipes, ' ', new Set())).toEqual([]);
  });
});
