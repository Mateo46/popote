// Configuration ESLint (format « flat config »).
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-e2e',
      'dev-dist',
      'mockups',
      'coverage',
      'test-results',
      'playwright-report',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Les composants n'accèdent jamais à Supabase directement : tout passe par src/data/.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Passer par src/data/ (seul endroit autorisé à parler à Supabase).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/data/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Code exécuté hors navigateur : Edge Functions (Deno) et tests de parcours (Node).
    files: ['supabase/functions/**/*.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: { globals: { ...globals.node, Deno: 'readonly' } },
  },
);
