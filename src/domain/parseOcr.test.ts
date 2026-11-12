import { describe, expect, it } from 'vitest';
import { parseIngredientLine, parseNumber, parseOcr } from './parseOcr';

/** Texte OCR typique d'un recto de fiche (erreurs de lecture comprises). */
const recto = `HelloFresh
Bò bún vietnamien au bœuf sauté
avec des nouilles de riz & des cacahuètes
45 min    Moyen
Ingrédients   2P  3P  4P
Tête d'ail   2   3   4
Émincés de bœuf (g) 240 360 480
½ sachet Citronnelle moulue
Sauce po1sson  1 sachet  1½ sachet  2 sachets
Nouilles plates de riz 1OO g 150 g 200 g
Carotte   1   2   2
À ajouter vous-même
Cassonade   3 cc  4½ cc  6 cc
Huile de tournesol  1½ cs  2 cs  3 cs
Poivre et sel
Valeurs nutritionnelles   Pour 100 g   Par portion
Énergie (kcal)   143 kcal   586 kcal
Matières grasses   5,6 g   22,9 g
dont saturés   1 g   4,1 g
Glucides   15,3 g   62,7 g
dont sucres   3,9 g   16 g
Protéines   6,9 g   28,4 g
Sel   1,5 g   6,1 g
Allergènes : poisson, arachides, graines de sésame`;

/** Texte OCR typique d'un verso : numéros d'étapes seuls sur leur ligne ou en début. */
const verso = `1
Portez une grande casserole d'eau salée
à ébullition. Ciselez l'ail.
2. Faites cuire les nouilles 5 min, puis
égouttez-les.
3
Coupez le concombre en demi-lunes.
Ajoutez 200 g de cacahuètes concassées.`;

describe('parseOcr', () => {
  const result = parseOcr([recto, verso], new Set());

  it('trouve le titre, le sous-titre et la durée', () => {
    expect(result.title).toBe('Bò bún vietnamien au bœuf sauté');
    expect(result.subtitle).toBe('avec des nouilles de riz & des cacahuètes');
    expect(result.minutes).toBe(45);
  });

  it('lit les ingrédients en colonnes, en gardant celle de 2 personnes', () => {
    const byName = Object.fromEntries(result.ingredients.map((i) => [i.name, i]));
    expect(byName["Tête d'ail"]).toMatchObject({ quantity: 2, unit: null, shipped: true });
    expect(byName['Émincés de bœuf']).toMatchObject({ quantity: 240, unit: 'g' });
    expect(byName['Citronnelle moulue']).toMatchObject({ quantity: 0.5, unit: 'sachet' });
    expect(byName['Carotte']).toMatchObject({ quantity: 1 });
  });

  it('corrige « 1OO » en 100 mais signale les lignes douteuses', () => {
    const noodles = result.ingredients.find((i) => i.name.startsWith('Nouilles'));
    expect(noodles).toMatchObject({ quantity: 100, unit: 'g', suspicious: true });
    const sauce = result.ingredients.find((i) => i.name.startsWith('Sauce'));
    expect(sauce).toMatchObject({ suspicious: true, quantity: 1 });
    const carrot = result.ingredients.find((i) => i.name === 'Carotte');
    expect(carrot?.suspicious).toBe(false);
  });

  it('range « à ajouter vous-même » en ingrédients à avoir chez soi', () => {
    const pantry = result.ingredients.filter((i) => i.shipped === false).map((i) => i.name);
    expect(pantry).toEqual(['Cassonade', 'Huile de tournesol', 'Poivre et sel']);
    expect(result.ingredients.find((i) => i.name === 'Cassonade')).toMatchObject({
      quantity: 3,
      unit: 'cc',
    });
  });

  it('prend la colonne « par portion » de la nutrition', () => {
    expect(result.nutrition).toEqual({
      kcal: 586,
      fat: 22.9,
      saturated_fat: 4.1,
      carbs: 62.7,
      sugars: 16,
      protein: 28.4,
      salt: 6.1,
    });
  });

  it('découpe les étapes numérotées sans confondre « 200 g » avec un numéro', () => {
    expect(result.steps).toEqual([
      "Portez une grande casserole d'eau salée à ébullition. Ciselez l'ail.",
      'Faites cuire les nouilles 5 min, puis égouttez-les.',
      'Coupez le concombre en demi-lunes. Ajoutez 200 g de cacahuètes concassées.',
    ]);
  });

  it('lit les allergènes', () => {
    expect(result.allergens).toEqual(['poisson', 'arachides', 'graines de sésame']);
  });

  it('signale les mots lus avec une faible confiance', () => {
    const flagged = parseOcr(['Ingrédients\n2 Carotte'], new Set(['Carotte']));
    expect(flagged.ingredients[0]?.suspicious).toBe(true);
  });

  it('ne prend pas une quantité « 1 » pour le début des étapes', () => {
    const parsed = parseOcr(['Ingrédients\n1 sachet Sauce soja\nCarotte 2', verso]);
    expect(parsed.ingredients.map((i) => i.name)).toEqual(['Sauce soja', 'Carotte']);
    expect(parsed.steps).toHaveLength(3);
  });

  it('reste utilisable sur un texte sans structure', () => {
    const loose = parseOcr(['Une photo floue\nrien de lisible']);
    expect(loose.title).toBe('Une photo floue');
    expect(loose.ingredients).toEqual([]);
    expect(loose.steps).toEqual([]);
  });
});

describe('parseIngredientLine', () => {
  it.each([
    ['400 g Grenailles', { name: 'Grenailles', quantity: 400, unit: 'g' }],
    ['2 pièce(s) Tomate', { name: 'Tomate', quantity: 2, unit: 'pièce(s)' }],
    ['Persil plat 10 g 15 g 20 g', { name: 'Persil plat', quantity: 10, unit: 'g' }],
    ['Moutarde', { name: 'Moutarde', quantity: null, unit: null }],
  ])('« %s »', (line, expected) => {
    expect(parseIngredientLine(line, null, true)).toMatchObject(expected);
  });
});

describe('parseNumber', () => {
  it.each([
    ['1,5', 1.5],
    ['½', 0.5],
    ['1½', 1.5],
    ['1/2', 0.5],
  ])('%s → %s', (text, value) => expect(parseNumber(text)).toBe(value));
});

describe('confusions OCR sur les fractions', () => {
  it('lit « 1% cs » comme « 1½ cs »', () => {
    expect(parseIngredientLine('Huile de tournesol 1%cs 2 cs 3 cs', null, false)).toMatchObject({
      name: 'Huile de tournesol',
      quantity: 1.5,
      unit: 'cs',
    });
  });
});
