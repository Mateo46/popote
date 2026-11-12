/**
 * Racine de l'application : vérifie la configuration, puis fournit le cache de
 * données (TanStack Query) et le routeur.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { appConfig } from './config';
import { ConfigErrorPage } from './features/shell/ConfigErrorPage';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Les données changent peu : on évite de recharger à chaque changement d'écran,
      // mais on se resynchronise au retour au premier plan (modifs de l'autre téléphone).
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  if (!appConfig.ok) return <ConfigErrorPage errors={appConfig.errors} />;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
