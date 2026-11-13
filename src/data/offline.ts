/**
 * Consultation hors connexion : le cache des données (TanStack Query) est enregistré
 * dans IndexedDB et rechargé au lancement. Les recettes déjà vues restent donc lisibles
 * sans réseau ; les modifications, elles, demandent une connexion.
 *
 * Les photos sont gardées par le service worker (voir vite.config.ts, runtimeCaching).
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';

/** Durée de conservation du cache hors ligne. */
export const OFFLINE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 jours

const CACHE_KEY = 'popote.query-cache';

export const persister = createAsyncStoragePersister({
  key: CACHE_KEY,
  storage: {
    getItem: (key) => get<string>(key).then((value) => value ?? null),
    setItem: (key, value: string) => set(key, value),
    removeItem: (key) => del(key),
  },
  // Écrit au plus une fois par seconde, même si le cache change souvent.
  throttleTime: 1000,
});

/** Efface le cache hors ligne (à la déconnexion : les recettes ne restent pas sur l'appareil). */
export function clearOfflineCache(): Promise<void> {
  return del(CACHE_KEY);
}
