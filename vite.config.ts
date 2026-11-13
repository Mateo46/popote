/**
 * Configuration Vite (build), du plugin PWA et de Vitest (tests).
 *
 * `VITE_BASE_PATH` vaut « / » en local et « /popote/ » sur GitHub Pages, qui sert
 * l'application dans un sous-dossier. Le manifeste et le service worker en dépendent.
 */
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Icônes générées à partir d'une seule image (preset minimal-2023 :
        // favicon, icônes 64/192/512, icône « maskable » et icône Apple).
        pwaAssets: {
          image: 'public/icon.svg',
          preset: 'minimal-2023',
        },
        manifest: {
          name: 'Popote',
          short_name: 'Popote',
          description: 'Nos recettes HelloFresh, notées et faciles à retrouver.',
          lang: 'fr',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f4f5f3',
          theme_color: '#f4f5f3',
        },
        workbox: {
          // Toute navigation hors ligne retombe sur l'application (routage côté client).
          navigateFallback: `${base}index.html`,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          runtimeCaching: [
            {
              // Photos du bucket privé : leur adresse contient un jeton qui change à chaque
              // signature. On les met en cache sous leur chemin seul, pour les retrouver
              // hors connexion quel que soit le jeton.
              urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/photos/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'popote-photos',
                expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [200] },
                plugins: [
                  {
                    cacheKeyWillBeUsed: async ({ request }) => {
                      const url = new URL(request.url);
                      url.search = '';
                      return url.href;
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      // Les tests de parcours (e2e/) sont lancés par Playwright, pas par Vitest.
      exclude: ['e2e/**', 'node_modules/**'],
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
