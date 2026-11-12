/// <reference types="vite/client" />

/** Variables d'environnement lues au build (voir .env.example). */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Version de l'application, injectée depuis package.json par vite.config.ts. */
declare const __APP_VERSION__: string;
