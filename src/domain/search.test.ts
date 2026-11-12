import { describe, expect, it } from 'vitest';
import type { Ingredient } from './recipe';
import { noFilters, searchRecipes, topTags, type SearchFilters } from './search';

const ing = (name: string): Ingredient => ({
  name,
  normalized: '',
  quantity: null,
  unit: null,
  shipped: null,
});

function recipe(title: string, extra: Partial<Parameters<typeof searchRecipes>[0][number]> = {}) {
  return {
    title,
    subtitle: null,
    tags: [],
    ingredients: [],
    rating: null,
    prepMinutes: null,
    totalMinutes: null,
    cookLog: [],
    ...extra,
  } as Parameters<typeof searchRecipes>[0][number];
}

const recipes = [
  recipe('Bavette grillée & sauce chimichurri', {
    subtitle: 'avec une purée de patate douce',
    rating: 5,
    totalMinutes: 35,
    ingredients: [ing('Patate douce'), ing('Bavette de bœuf')],
    cookLog: [{ id: '1', cookedOn: '2026-11-01' }],
  }),
  recipe('Azteca Bowl : poulet, avocat & sauce yaourt', {
    rating: 4.5,
    totalMinutes: 35,
    tags: ['Famille'],
    ingredients: [ing('Patate douce'), ing('Blanc de poulet')],
  }),
  recipe('Aubergine laquée au miso', {
    totalMinutes: 50,
    tags: ['Végétarien'],
    ingredients: [ing('Aubergine'), ing('Œuf')],
  }),
];

const titles = (query: string, filters: SearchFilters = noFilters) =>
  searchRecipes(recipes, query, filters).map((hit) => hit.recipe.title.split(' ')[0]);

describe('searchRecipes', () => {
  it('ne renvoie rien sans texte ni filtre', () => {
    expect(titles('')).toEqual([]);
  });

  it('ignore accents, casse et pluriel, et accepte un début de mot', () => {
    expect(titles('BAV')).toEqual(['Bavette']);
    expect(titles('aubergines')).toEqual(['Aubergine']);
    expect(titles('laquee')).toEqual(['Aubergine']);
    expect(titles('oeuf')).toEqual(['Aubergine']);
  });

  it('exige tous les mots, répartis dans la recette', () => {
    expect(titles('poulet patate')).toEqual(['Azteca']);
    expect(titles('poulet aubergine')).toEqual([]);
  });

  it('classe titre et sous-titre avant ingrédient, et dit où il a trouvé', () => {
    const hits = searchRecipes(recipes, 'patate douce', noFilters);
    expect(hits.map((h) => [h.recipe.title.split(' ')[0], h.field, h.matched])).toEqual([
      ['Bavette', 'subtitle', null],
      ['Azteca', 'ingredient', 'Patate douce'],
    ]);
  });

  it('trouve par tag', () => {
    expect(searchRecipes(recipes, 'vegetarien', noFilters)[0]).toMatchObject({
      field: 'tag',
      matched: 'Végétarien',
    });
  });

  it('applique les filtres, même sans texte', () => {
    expect(titles('', { ...noFilters, minRating: 4.5 })).toEqual(['Bavette', 'Azteca']);
    expect(titles('', { ...noFilters, maxMinutes: 40 })).toEqual(['Bavette', 'Azteca']);
    expect(titles('', { ...noFilters, neverCooked: true })).toEqual(['Azteca', 'Aubergine']);
    expect(titles('', { ...noFilters, notRated: true })).toEqual(['Aubergine']);
    expect(titles('patate', { ...noFilters, tags: ['Famille'] })).toEqual(['Azteca']);
  });

  it('reste rapide sur 300 recettes', () => {
    const many = Array.from({ length: 300 }, (_, i) =>
      recipe(`Recette ${i} au poulet`, {
        subtitle: 'avec du riz et des légumes de saison',
        tags: ['Rapide', 'Famille'],
        ingredients: Array.from({ length: 15 }, (_, j) => ing(`Ingrédient numéro ${j}`)),
      }),
    );
    const start = performance.now();
    for (let i = 0; i < 10; i++) searchRecipes(many, 'poulet riz ingredient', noFilters);
    const perSearch = (performance.now() - start) / 10;
    expect(perSearch).toBeLessThan(50);
  });
});

describe('topTags', () => {
  it('renvoie les tags les plus fréquents', () => {
    expect(topTags([{ tags: ['A', 'B'] }, { tags: ['B'] }, { tags: ['C'] }], 2)).toEqual([
      'B',
      'A',
    ]);
  });
});
