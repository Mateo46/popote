import { describe, expect, it } from 'vitest';
import { extractUrl, hellofreshIdInUrl } from './link';

describe('extractUrl', () => {
  it('extrait le lien d’une phrase de partage', () => {
    expect(
      extractUrl(
        'Découvrez cette recette HelloFresh : https://www.hellofresh.fr/recipes/bo-bun-678a771300ea0a08f0b229c7.',
      ),
    ).toBe('https://www.hellofresh.fr/recipes/bo-bun-678a771300ea0a08f0b229c7');
  });

  it('complète un lien sans protocole', () => {
    expect(extractUrl('www.hellofresh.fr/recipes/x')).toBe('https://www.hellofresh.fr/recipes/x');
  });

  it('renvoie null sans lien', () => {
    expect(extractUrl('bavette')).toBeNull();
  });
});

describe('hellofreshIdInUrl', () => {
  it('lit l’identifiant en fin d’adresse', () => {
    expect(
      hellofreshIdInUrl('https://www.hellofresh.fr/recipes/x-678a771300ea0a08f0b229c7?a=1'),
    ).toBe('678a771300ea0a08f0b229c7');
    expect(hellofreshIdInUrl('https://www.hellofresh.fr/recipes')).toBeNull();
  });
});
