import { afterEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, setThemePreference } from './theme';

afterEach(() => setThemePreference('system'));

describe('setThemePreference', () => {
  it('pose data-theme et enregistre le choix', () => {
    setThemePreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('« system » retire l’attribut et le choix enregistré', () => {
    setThemePreference('light');
    setThemePreference('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
