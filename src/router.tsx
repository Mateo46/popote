/**
 * Routes de l'application (React Router, mode « data »).
 *
 * Toutes les routes sauf /connexion passent par AppShell, qui exige une session.
 * `basename` suit le sous-dossier de publication (GitHub Pages : /popote/).
 */
import { createBrowserRouter } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { NotFoundPage } from './features/shell/NotFoundPage';
import { AppShell } from './features/shell/AppShell';
import { PantryPage } from './features/pantry/PantryPage';
import { RecipesPage } from './features/recipes/RecipesPage';
import { SearchPage } from './features/search/SearchPage';
import { SettingsPage } from './features/settings/SettingsPage';

export const router = createBrowserRouter(
  [
    { path: '/connexion', element: <LoginPage /> },
    {
      element: <AppShell />,
      children: [
        { index: true, element: <RecipesPage /> },
        { path: 'frigo', element: <PantryPage /> },
        { path: 'recherche', element: <SearchPage /> },
        { path: 'reglages', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
