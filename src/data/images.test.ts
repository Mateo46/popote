import { describe, expect, it } from 'vitest';
import { fitWithin, thumbPath } from './images';

describe('fitWithin', () => {
  it('réduit le grand côté à la taille maximale', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('n’agrandit jamais une petite image', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe('thumbPath', () => {
  it('ajoute le suffixe de vignette', () => {
    expect(thumbPath('r1/p1.jpg')).toBe('r1/p1.thumb.jpg');
  });
});
