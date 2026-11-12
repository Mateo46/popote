import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cleanStepText,
  extractRecipe,
  hellofreshIdFrom,
  ImportError,
  normalizeRecipeUrl,
  parseDuration,
  parseIngredientLine,
} from './extract';

// Les tests sont lancés depuis la racine du dépôt (npm test).
const fixture = (name: string) =>
  readFileSync(
    join(process.cwd(), 'supabase/functions/import-hellofresh/fixtures', `${name}.html`),
    'utf8',
  );

describe('extractRecipe — __NEXT_DATA__', () => {
  const bavette = extractRecipe(
    fixture('bavette'),
    'https://www.hellofresh.fr/recipes/bavette-et-beurre-aux-fines-herbes-5d53de8f162d6f000d5dac5a',
  );

  it('lit les informations générales', () => {
    expect(bavette).toMatchObject({
      title: 'Bavette et beurre aux fines herbes',
      subtitle: 'Avec des tomates au four, de la salade et des grenailles',
      hellofreshId: '5d53de8f162d6f000d5dac5a',
      prepMinutes: 35,
      totalMinutes: null, // « PT0S » chez HelloFresh
      difficulty: 2,
      servings: 2,
      extractedFrom: 'next-data',
    });
    expect(bavette.coverImageUrl).toBe(
      'https://img.hellofresh.com/w_1600,q_75,f_jpg/hellofresh_s3/image/5d53de8f162d6f000d5dac5a-e517c713.jpg',
    );
  });

  it('prend les quantités pour 2 personnes et garde « à avoir chez soi »', () => {
    expect(bavette.ingredients).toHaveLength(15);
    expect(bavette.ingredients[0]).toEqual({
      name: 'Grenailles',
      quantity: 400,
      unit: 'g',
      shipped: true,
    });
    expect(bavette.ingredients.find((i) => i.name === 'Beurre')).toMatchObject({
      shipped: false,
    });
    expect(bavette.ingredients.find((i) => i.name === 'Poivre et sel')).toMatchObject({
      quantity: 0,
      unit: 'selon le goût',
    });
  });

  it('nettoie les étapes et garde leur photo', () => {
    expect(bavette.steps).toHaveLength(6);
    expect(bavette.steps[0]?.imageUrl).toBe(
      'https://img.hellofresh.com/w_800,q_75,f_jpg/hellofresh_s3/5d53de8f162d6f000d5dac5a/step-17a6b459.jpg',
    );
  });

  it('lit la nutrition par portion, avec le sel au bon endroit', () => {
    expect(bavette.nutrition).toEqual({
      kcal: 941,
      fat: 60,
      saturated_fat: 15,
      carbs: 58,
      sugars: 9.8,
      fiber: 8,
      protein: 38,
      salt: 0.4,
      serving_grams: 655,
    });
  });

  it('filtre les tags techniques et les traces d’allergènes', () => {
    const bobun = extractRecipe(fixture('bobun'), 'https://www.hellofresh.fr/recipes/x');
    expect(bobun.tags).toEqual(['Famille', 'Calorie Smart', 'Faible en calories']);
    expect(bobun.allergens).not.toContain('Peut contenir des traces d’allergènes');
    expect(bobun.allergens).not.toContain("Peut contenir des traces d'allergènes");
    expect(new Set(bobun.allergens).size).toBe(bobun.allergens.length);
    // L'URL canonique de la page l'emporte sur l'adresse demandée (redirections).
    expect(bobun.hellofreshId).toBe('678a771300ea0a08f0b229c7');
  });

  it('arrondit les quantités en tiers et retire la phrase standard des étapes', () => {
    const aubergine = extractRecipe(fixture('aubergine'), 'https://www.hellofresh.fr/recipes/x');
    expect(aubergine.ingredients.find((i) => i.name === 'Oignon nouveau')?.quantity).toBe(0.5);
    const first = aubergine.steps[0]?.text ?? '';
    expect(first).not.toMatch(/Veillez/);
    expect(first).toBe(
      "Étape 1 : première consigne d'exemple. Deuxième consigne d’exemple, par personne : ½ cc.",
    );
  });
});

describe('extractRecipe — JSON-LD en repli', () => {
  it('lit le titre, les ingrédients, les étapes et la nutrition', () => {
    const recipe = extractRecipe(
      fixture('jsonld-only'),
      'https://www.hellofresh.fr/recipes/bavette-et-beurre-aux-fines-herbes-5d53de8f162d6f000d5dac5a',
    );
    expect(recipe.extractedFrom).toBe('json-ld');
    expect(recipe.title).toMatch(/^Bavette et beurre aux fines herbes/);
    expect(recipe.ingredients[0]).toEqual({
      name: 'Grenailles',
      quantity: 400,
      unit: 'g',
      shipped: null,
    });
    expect(recipe.steps[0]?.text).toBe("Étape 1 : consigne d'exemple.");
    expect(recipe.nutrition).toMatchObject({ kcal: 941, salt: 0.4 });
    expect(recipe.totalMinutes).toBe(35);
    expect(recipe.hellofreshId).toBe('5d53de8f162d6f000d5dac5a');
  });

  it('signale une page sans recette', () => {
    expect(() => extractRecipe('<html><body>Rien</body></html>', 'https://x')).toThrow(ImportError);
  });
});

describe('utilitaires', () => {
  it.each([
    ['PT35M', 35],
    ['PT1H10M', 70],
    ['PT0S', null],
    [undefined, null],
  ])('parseDuration(%s) = %s', (iso, minutes) => expect(parseDuration(iso)).toBe(minutes));

  it('nettoie le HTML, les entités et les puces', () => {
    expect(cleanStepText('<ul>\n<li>Ciselez l&#39;ail.</li>\n<li>**Salez**.</li>\n</ul>')).toBe(
      "Ciselez l'ail. Salez.",
    );
    expect(cleanStepText('- Coupez&nbsp;les tomates.\n- Enfournez.')).toBe(
      'Coupez les tomates. Enfournez.',
    );
  });

  it('lit une ligne d’ingrédient JSON-LD', () => {
    expect(parseIngredientLine('½ pièce(s) Échalote')).toEqual({
      name: 'Échalote',
      quantity: 0.5,
      unit: 'pièce(s)',
      shipped: null,
    });
    expect(parseIngredientLine('Poivre et sel')).toMatchObject({
      name: 'Poivre et sel',
      quantity: null,
    });
  });

  it('trouve l’identifiant HelloFresh', () => {
    expect(hellofreshIdFrom('https://www.hellofresh.fr/recipes/x-678a771300ea0a08f0b229c7')).toBe(
      '678a771300ea0a08f0b229c7',
    );
    expect(hellofreshIdFrom('678a771300ea0a08f0b229c7-fr-FR')).toBe('678a771300ea0a08f0b229c7');
    expect(hellofreshIdFrom('pas-un-id')).toBeNull();
  });
});

describe('normalizeRecipeUrl', () => {
  it('normalise une adresse de recette valide', () => {
    expect(
      normalizeRecipeUrl('http://hellofresh.fr/recipes/bo-bun-678a771300ea0a08f0b229c7/?utm=x#top'),
    ).toBe('https://www.hellofresh.fr/recipes/bo-bun-678a771300ea0a08f0b229c7');
  });

  it.each([
    ['pas une url', 'Ce n’est pas une adresse web valide.'],
    ['https://www.hellofresh.be/recipes/x', 'Seuls les liens hellofresh.fr sont acceptés.'],
    ['https://evil.example/recipes/x', 'Seuls les liens hellofresh.fr sont acceptés.'],
    [
      'https://www.hellofresh.fr.evil.example/recipes/x',
      'Seuls les liens hellofresh.fr sont acceptés.',
    ],
    ['https://www.hellofresh.fr/menus', 'Ce lien n’est pas une page de recette'],
  ])('refuse « %s »', (input, message) => {
    expect(() => normalizeRecipeUrl(input)).toThrow(message);
  });
});
