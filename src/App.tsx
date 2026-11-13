/**
 * Racine de l'application : vérifie la configuration, puis fournit le cache de
 * données (TanStack Query, conservé hors ligne dans IndexedDB) et le routeur.
 */
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from 'react-router/dom';
import { appConfig } from './config';
import { OFFLINE_MAX_AGE, persister } from './data/offline';
import { ConfigErrorPage } from './features/shell/ConfigErrorPage';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Les données changent peu : on évite de recharger à chaque changement d'écran,
      // mais on se resynchronise au retour au premier plan (modifs de l'autre téléphone).
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      // Gardées en mémoire aussi longtemps que le cache hors ligne.
      gcTime: OFFLINE_MAX_AGE,
    },
    mutations: {
      // Hors connexion, une modification échoue tout de suite avec un message, au lieu
      // d'être mise en attente sans que l'utilisateur le sache.
      networkMode: 'always',
    },
  },
});

export function App() {
  if (!appConfig.ok) return <ConfigErrorPage errors={appConfig.errors} />;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: OFFLINE_MAX_AGE,
        // Une nouvelle version de l'app repart d'un cache neuf (format des données).
        buster: __APP_VERSION__,
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  );
}
