import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize';

describe('normalizeName', () => {
  it.each([
    ['Échalote', 'echalote'],
    ["Huile d'olive", 'huile d olive'],
    ['Huile d’olive vierge extra', 'huile d olive vierge extra'],
    ['(Mini) Concombre', 'mini concombre'],
    ['Œuf', 'oeuf'],
    ['  Bavette   de bœuf ', 'bavette de boeuf'],
  ])('« %s » devient « %s »', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});
