import { describe, expect, it } from 'vitest';
import { ingredientKey, keyMatches, splitCompound } from './ingredients';

describe('ingredientKey', () => {
  it.each([
    ['Échalote', 'echalote'],
    ['Échalotes ciselées', 'echalote'],
    ['Tomates', 'tomate'],
    ['Poireaux', 'poireau'],
    ["Gousse d'ail", 'ail'],
    ["Tête d'ail", 'ail'],
    ['Persil plat', 'persil'],
    ['Coriandre fraîche', 'coriandre'],
    ['Blanc de poulet', 'poulet'],
    ['Viande hachée au bœuf', 'boeuf hache'],
    ['Émincés de bœuf', 'boeuf'],
    ['Œufs', 'oeuf'],
    ['Œuf', 'oeuf'],
    ['Pois chiches', 'pois chiche'],
    ['Riz', 'riz'],
    ['Noix de cajou concassées', 'noix de cajou'],
    ['Cacahuètes non salées', 'cacahuete'],
    ['(Mini) Concombre', 'concombre'],
    ['Paprika fumé en poudre', 'paprika fume'],
    ['Grenailles', 'pomme de terre'],
    ['Yaourt à la grecque', 'yaourt grec'],
    ['Salade en sachet', 'salade'],
    ['Pommes de terre', 'pomme de terre'],
  ])('« %s » → « %s »', (name, key) => expect(ingredientKey(name)).toBe(key));
});

describe('keyMatches', () => {
  it('accepte une clé identique ou plus précise côté recette', () => {
    expect(keyMatches('persil', 'persil')).toBe(true);
    expect(keyMatches('huile d olive vierge extra', 'huile d olive')).toBe(true);
    expect(keyMatches('vinaigre de vin rouge', 'vinaigre')).toBe(true);
  });

  it('ne confond pas des ingrédients différents', () => {
    expect(keyMatches('huile de sesame', 'huile d olive')).toBe(false);
    expect(keyMatches('nouille de riz', 'riz')).toBe(false);
    expect(keyMatches('oignon nouveau', 'oignon nouveau')).toBe(true);
    expect(keyMatches('sucre', 'sucre roux')).toBe(false);
    expect(keyMatches('selle d agneau', 'sel')).toBe(false);
  });
});

describe('splitCompound', () => {
  it('sépare « poivre et sel »', () => {
    expect(splitCompound(ingredientKey('Poivre et sel'))).toEqual(['poivre', 'sel']);
  });
});
