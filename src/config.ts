/**
 * Lecture et validation de la configuration fournie au build (variables VITE_*).
 *
 * On valide au démarrage plutôt qu'au premier appel réseau : une variable manquante
 * produit alors un message clair à l'écran au lieu d'erreurs Supabase incompréhensibles.
 */
import { z } from 'zod';

const configSchema = z.object({
  supabaseUrl: z.url({ message: 'VITE_SUPABASE_URL doit être une URL (https://….supabase.co).' }),
  supabaseKey: z.string().min(20, {
    message: 'VITE_SUPABASE_PUBLISHABLE_KEY est vide ou incomplète.',
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; errors: string[] };

/**
 * Valide les variables d'environnement brutes.
 * Exportée séparément de `appConfig` pour pouvoir être testée sans dépendre de l'environnement.
 */
export function parseConfig(env: Partial<Record<string, string | undefined>>): ConfigResult {
  const result = configSchema.safeParse({
    // Tolère l'URL de l'API REST (…/rest/v1/) collée par erreur à la place de l'URL du projet.
    supabaseUrl: env.VITE_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, ''),
    supabaseKey: env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  });
  if (result.success) return { ok: true, config: result.data };
  return { ok: false, errors: result.error.issues.map((issue) => issue.message) };
}

/** Configuration de l'application, validée une fois au chargement. */
export const appConfig: ConfigResult = parseConfig(import.meta.env);
