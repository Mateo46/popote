import { describe, expect, it } from 'vitest';
import { sortRecipes } from './sort';

type R = Parameters<typeof sortRecipes>[0][number];

function recipe(title: string, extra: Partial<R> = {}): R {
  return {
    title,
    rating: null,
    createdAt: '2026-01-01T00:00:00Z',
    prepMinutes: null,
    totalMinutes: null,
    cookLog: [],
    ...extra,
  };
}

const titles = (list: R[]) => list.map((r) => r.title);

describe('sortRecipes', () => {
  it('« Mieux notées » : note décroissante, non notées à la fin, puis alphabétique', () => {
    const list = [
      recipe('Bò bún', { rating: 4.5 }),
      recipe('Aubergine'),
      recipe('Bavette', { rating: 5 }),
      recipe('Azteca', { rating: 4.5 }),
    ];
    expect(titles(sortRecipes(list, 'rating'))).toEqual([
      'Bavette',
      'Azteca',
      'Bò bún',
      'Aubergine',
    ]);
  });

  it('« Rapides » : plus courte durée d’abord, sans durée à la fin', () => {
    const list = [
      recipe('A', { prepMinutes: 45, totalMinutes: 35 }),
      recipe('B'),
      recipe('C', { totalMinutes: 20 }),
    ];
    expect(titles(sortRecipes(list, 'quick'))).toEqual(['C', 'A', 'B']);
  });

  it('« Cuisinées récemment » : dernière date d’abord, jamais cuisinées à la fin', () => {
    const list = [
      recipe('A', { cookLog: [{ id: '1', cookedOn: '2026-09-01' }] }),
      recipe('B'),
      recipe('C', { cookLog: [{ id: '2', cookedOn: '2026-11-01' }] }),
    ];
    expect(titles(sortRecipes(list, 'cooked'))).toEqual(['C', 'A', 'B']);
  });

  it('« Récentes » : dernière ajoutée d’abord', () => {
    const list = [
      recipe('A', { createdAt: '2026-01-01T00:00:00Z' }),
      recipe('B', { createdAt: '2026-03-01T00:00:00Z' }),
    ];
    expect(titles(sortRecipes(list, 'recent'))).toEqual(['B', 'A']);
  });

  it('ne modifie pas la liste d’origine', () => {
    const list = [recipe('B'), recipe('A')];
    sortRecipes(list, 'rating');
    expect(titles(list)).toEqual(['B', 'A']);
  });
});
