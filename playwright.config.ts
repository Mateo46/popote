/**
 * Tests de parcours (Playwright) : connexion, recherche, notation, accessibilité.
 *
 * L'app est construite avec une fausse adresse Supabase (http://supabase.test) et chaque
 * appel réseau est simulé dans le test (e2e/mockSupabase.ts) : aucune donnée réelle n'est
 * lue ni modifiée, et la CI n'a besoin d'aucun secret.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    // Le service worker servirait certaines requêtes lui-même, hors de portée des mocks.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  // Chaque parcours est joué en thème clair et en thème sombre (contrastes vérifiés par axe).
  projects: [
    { name: 'iphone-clair', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
    {
      name: 'iphone-sombre',
      use: { ...devices['iPhone 15'], browserName: 'chromium', colorScheme: 'dark' },
    },
  ],
  webServer: {
    command: `npm run build:e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
