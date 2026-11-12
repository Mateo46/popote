import { describe, expect, it } from 'vitest';
import {
  daysSince,
  formatDaysAgo,
  formatLongDate,
  formatMinutes,
  formatNumber,
  formatQuantity,
  formatRating,
  toLocalIsoDate,
} from './format';

describe('formatNumber', () => {
  it.each([
    [0.5, '½'],
    [1.5, '1½'],
    [0.33000001311302185, '⅓'],
    [0.6600000262260437, '⅔'],
    [2, '2'],
    [2.4, '2,4'],
  ])('%s → %s', (value, expected) => expect(formatNumber(value)).toBe(expected));
});

describe('formatQuantity', () => {
  it.each([
    [240, 'g', '240 g'],
    [2, 'pièce(s)', '2'],
    [0.5, 'sachet(s)', '½ sachet'],
    [2, 'sachet(s)', '2 sachets'],
    [6, 'cs', '6 c. à s.'],
    [1, 'cc', '1 c. à c.'],
    [0, 'selon le goût', 'selon le goût'],
    [null, null, ''],
    [3, 'cm', '3 cm'],
  ] as const)('%s %s → « %s »', (quantity, unit, expected) =>
    expect(formatQuantity(quantity, unit)).toBe(expected),
  );
});

describe('formatRating / formatMinutes', () => {
  it('écrit les décimales à la française', () => expect(formatRating(4.5)).toBe('4,5'));
  it.each([
    [35, '35 min'],
    [60, '1 h'],
    [95, '1 h 35'],
  ])('%s min → %s', (minutes, expected) => expect(formatMinutes(minutes)).toBe(expected));
});

describe('dates', () => {
  const today = new Date(2026, 10, 12); // 12 novembre 2026, heure locale

  it('donne la date locale', () => expect(toLocalIsoDate(today)).toBe('2026-11-12'));
  it('compte les jours écoulés', () => expect(daysSince('2026-10-31', today)).toBe(12));

  it.each([
    ['2026-11-12', 'Aujourd’hui'],
    ['2026-11-11', 'Hier'],
    ['2026-10-31', 'Il y a 12 j'],
    ['2026-10-22', 'Il y a 3 sem.'],
    ['2026-07-12', 'Il y a 4 mois'],
    ['2024-10-01', 'Il y a 2 ans'],
  ])('%s → %s', (iso, expected) => expect(formatDaysAgo(iso, today)).toBe(expected));

  it('écrit la date longue avec majuscule', () =>
    expect(formatLongDate('2026-10-18')).toBe('Dimanche 18 octobre 2026'));
});
