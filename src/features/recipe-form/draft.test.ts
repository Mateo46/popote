import { describe, expect, it } from 'vitest';
import type { Recipe } from '../../domain/recipe';
import { draftFromRecipe, draftToInput, emptyDraft, parseAmount, type RecipeDraft } from './draft';

describe('parseAmount', () => {
  it.each([
    ['', null],
    ['2', 2],
    ['1,5', 1.5],
    ['1.5', 1.5],
    ['½', 0.5],
    ['1½', 1.5],
    ['1/2', 0.5],
  ])('« %s » → %s', (text, expected) => expect(parseAmount(text)).toBe(expected));

  it('signale une saisie illisible', () => {
    expect(parseAmount('beaucoup')).toBeNaN();
    expect(parseAmount('1/0')).toBeNaN();
  });
});

function filled(patch: Partial<RecipeDraft> = {}): RecipeDraft {
  const draft = emptyDraft();
  return {
    ...draft,
    title: '  Bavette et beurre aux fines herbes ',
    minutes: '35',
    ingredients: [
      {
        key: 'a',
        quantity: '240',
        unit: 'g',
        name: 'Bavette de bœuf',
        shipped: null,
      },
      { key: 'b', quantity: '', unit: '', name: '', shipped: null },
      {
        key: 'c',
        quantity: '½',
        unit: 'sachet(s)',
        name: 'Épices',
        shipped: false,
      },
    ],
    steps: [
      { key: 's1', text: 'Préchauffez le four.', imagePath: null, imageUrl: null },
      { key: 's2', text: '   ', imagePath: null, imageUrl: null },
    ],
    ...patch,
  };
}

describe('draftToInput', () => {
  it('convertit un brouillon valide et ignore les lignes vides', () => {
    const result = draftToInput(filled({ tags: 'Rapide, Bœuf, Rapide' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.title).toBe('Bavette et beurre aux fines herbes');
    expect(result.input.source).toBe('manual');
    expect(result.input.totalMinutes).toBe(35);
    expect(result.input.tags).toEqual(['Rapide', 'Bœuf']);
    expect(result.input.ingredients).toEqual([
      {
        name: 'Bavette de bœuf',
        normalized: 'bavette de boeuf',
        quantity: 240,
        unit: 'g',
        shipped: null,
      },
      {
        name: 'Épices',
        normalized: 'epice',
        quantity: 0.5,
        unit: 'sachet(s)',
        shipped: false,
      },
    ]);
    expect(result.input.steps).toEqual([{ text: 'Préchauffez le four.', image_path: null }]);
    expect(result.input.nutrition).toBeNull();
  });

  it('refuse un titre vide et une quantité illisible', () => {
    const result = draftToInput(
      filled({
        title: ' ',
        ingredients: [{ key: 'a', quantity: 'un peu', unit: '', name: 'Sel', shipped: null }],
      }),
    );
    expect(result).toEqual({
      ok: false,
      errors: ['Le titre est obligatoire.', '« Sel » : quantité « un peu » illisible.'],
    });
  });

  it('conserve la source et les données importées lors d’une modification', () => {
    const base = {
      source: 'hellofresh',
      sourceUrl: 'https://www.hellofresh.fr/recipes/x-5d53de8f162d6f000d5dac5a',
      hellofreshId: '5d53de8f162d6f000d5dac5a',
      allergens: ['Gluten'],
      utensils: ['Poêle'],
    } as Recipe;
    const result = draftToInput(filled(), base);
    expect(result.ok && result.input.source).toBe('hellofresh');
    expect(result.ok && result.input.allergens).toEqual(['Gluten']);
  });

  it('garde les valeurs nutritionnelles saisies', () => {
    const draft = filled();
    draft.nutrition.kcal = '941';
    draft.nutrition.salt = '0,4';
    const result = draftToInput(draft);
    expect(result.ok && result.input.nutrition).toEqual({ kcal: 941, salt: 0.4 });
  });
});

describe('draftFromRecipe', () => {
  it('reprend la plus grande des deux durées et les quantités en texte', () => {
    const recipe = {
      title: 'Bò bún',
      subtitle: null,
      description: null,
      prepMinutes: 45,
      totalMinutes: 35,
      servings: 2,
      difficulty: 2,
      tags: ['Famille'],
      ingredients: [
        {
          name: 'Citronnelle',
          normalized: 'citronnelle',
          quantity: 0.5,
          unit: 'sachet(s)',
          shipped: true,
        },
      ],
      steps: [],
      nutrition: { kcal: 586, salt: 6.1 },
    } as unknown as Recipe;
    const draft = draftFromRecipe(recipe);
    expect(draft.minutes).toBe('45');
    expect(draft.difficulty).toBe('2');
    expect(draft.ingredients[0]?.quantity).toBe('0,5');
    expect(draft.nutrition.salt).toBe('6,1');
    expect(draft.steps).toHaveLength(1);
  });
});
