/** Recettes d'exemple pour les tests d'écran (inspirées de vraies fiches HelloFresh). */
import type { Ingredient, Recipe } from '../domain/recipe';

const ing = (name: string, shipped: boolean | null = true): Ingredient => ({
  name,
  normalized: '',
  quantity: null,
  unit: null,
  shipped,
});

function recipe(id: string, patch: Partial<Recipe>): Recipe {
  return {
    id,
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    title: id,
    subtitle: null,
    description: null,
    source: 'manual',
    sourceUrl: null,
    hellofreshId: null,
    prepMinutes: null,
    totalMinutes: null,
    difficulty: null,
    servings: 2,
    tags: [],
    allergens: [],
    utensils: [],
    ingredients: [],
    steps: [],
    nutrition: null,
    rating: null,
    comment: null,
    coverPhotoId: null,
    photos: [],
    cookLog: [],
    ...patch,
  };
}

export const sampleRecipes: Recipe[] = [
  recipe('chimichurri', {
    title: 'Bavette grillée & sauce chimichurri',
    subtitle: 'avec une purée de patate douce',
    rating: 5,
    totalMinutes: 35,
    ingredients: [
      ing('Patate douce'),
      ing("Gousse d'ail"),
      ing('Échalote'),
      ing('Piment'),
      ing('Persil'),
      ing('Bavette de bœuf'),
      ing('Paprika fumé en poudre'),
      ing('Salade'),
      ing("Huile d'olive", false),
      ing('Poivre et sel', false),
    ],
  }),
  recipe('azteca', {
    title: 'Azteca Bowl : poulet, avocat & sauce yaourt',
    subtitle: "garni de patate douce & pickles d'oignon",
    rating: 4.5,
    totalMinutes: 35,
    tags: ['Famille'],
    ingredients: [
      ing('Patate douce'),
      ing('Oignon'),
      ing('Carotte'),
      ing('Avocat'),
      ing('Yaourt à la grecque'),
      ing('Blanc de poulet'),
    ],
  }),
  recipe('aubergine', {
    title: 'Aubergine laquée au miso',
    totalMinutes: 50,
    tags: ['Végétarien'],
    ingredients: [ing('Aubergine'), ing('Riz'), ing('Œuf', false), ing('Sucre', false)],
  }),
];
