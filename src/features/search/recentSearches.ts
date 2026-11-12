/**
 * Recherches récentes, propres à chaque appareil (stockage local du navigateur).
 * Une recherche est retenue quand on ouvre une recette depuis ses résultats.
 */
const STORAGE_KEY = 'popote.recentSearches';
const MAX_ENTRIES = 6;

export function readRecentSearches(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Place la recherche en tête de liste (sans doublon, insensible à la casse). */
export function rememberSearch(query: string): string[] {
  const text = query.trim();
  if (!text) return readRecentSearches();
  const next = [
    text,
    ...readRecentSearches().filter((item) => item.toLowerCase() !== text.toLowerCase()),
  ].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible : la liste ne sera simplement pas retenue.
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à faire.
  }
}
