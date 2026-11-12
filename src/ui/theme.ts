/**
 * Préférence d'apparence : « Système » (par défaut), « Clair » ou « Sombre ».
 *
 * « Système » retire l'attribut data-theme : les tokens suivent alors
 * prefers-color-scheme (voir src/styles/tokens.css). Le choix est propre à chaque
 * appareil, il n'est donc pas synchronisé entre les deux téléphones.
 */
import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Clé de stockage, aussi lue par le script en ligne d'index.html. */
export const THEME_STORAGE_KEY = 'popote.theme';

const listeners = new Set<() => void>();

/** Applique la préférence au document et l'enregistre. */
export function setThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session en cours.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentPreference(): ThemePreference {
  const value = document.documentElement.dataset.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Préférence courante, mise à jour quand l'utilisateur la change. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, currentPreference);
}
