/**
 * Routes de l'application (React Router, mode « data »).
 *
 * - Toutes les routes sauf /connexion passent par AppShell, qui exige une session.
 * - L'accueil est chargé tout de suite ; les autres écrans sont découpés (`lazy`) et
 *   téléchargés à la première visite, pour un démarrage plus rapide.
 * - `errorElement` affiche un écran clair en cas d'erreur imprévue (y compris un écran
 *   devenu introuvable après une mise à jour de l'app).
 * - `basename` suit le sous-dossier de publication (GitHub Pages : /popote/).
 */
import { createBrowserRouter } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { RecipesPage } from './features/recipes/RecipesPage';
import { AppShell } from './features/shell/AppShell';
import { ErrorPage } from './features/shell/ErrorPage';
import { NotFoundPage } from './features/shell/NotFoundPage';

export const router = createBrowserRouter(
  [
    { path: '/connexion', element: <LoginPage />, errorElement: <ErrorPage /> },
    {
      element: <AppShell />,
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <RecipesPage /> },
        {
          path: 'recettes/nouvelle',
          lazy: () =>
            import('./features/recipe-form/RecipeFormPage').then((m) => ({
              Component: m.NewRecipePage,
            })),
        },
        {
          path: 'recettes/:id',
          lazy: () =>
            import('./features/recipe-detail/RecipeDetailPage').then((m) => ({
              Component: m.RecipeDetailPage,
            })),
        },
        {
          path: 'recettes/:id/modifier',
          lazy: () =>
            import('./features/recipe-form/RecipeFormPage').then((m) => ({
              Component: m.EditRecipePage,
            })),
        },
        {
          path: 'frigo',
          lazy: () =>
            import('./features/pantry/PantryPage').then((m) => ({ Component: m.PantryPage })),
        },
        {
          path: 'recherche',
          lazy: () =>
            import('./features/search/SearchPage').then((m) => ({ Component: m.SearchPage })),
        },
        {
          path: 'reglages',
          lazy: () =>
            import('./features/settings/SettingsPage').then((m) => ({
              Component: m.SettingsPage,
            })),
        },
        {
          path: 'reglages/basiques',
          lazy: () =>
            import('./features/settings/StaplesPage').then((m) => ({ Component: m.StaplesPage })),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
