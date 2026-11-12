/**
 * Client Supabase unique de l'application.
 *
 * Seuls les fichiers de src/data/ l'importent (règle ESLint `no-restricted-imports`) :
 * les écrans passent par les fonctions et hooks de ce dossier, ce qui garde l'accès
 * aux données à un seul endroit.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../config';

function create(): SupabaseClient | null {
  if (!appConfig.ok) return null;
  return createClient(appConfig.config.supabaseUrl, appConfig.config.supabaseKey, {
    auth: {
      // Session conservée dans le stockage de l'app installée (distinct de Safari sur iOS)
      // et renouvelée automatiquement : on reste connecté d'une ouverture à l'autre.
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'popote.auth',
      // Pas de lien magique ni d'OAuth : aucune session à lire dans l'URL.
      detectSessionInUrl: false,
    },
  });
}

/** `null` quand la configuration est invalide (l'app affiche alors un écran d'erreur). */
export const supabase = create();

/** Renvoie le client, ou lève une erreur explicite si la configuration est absente. */
export function getSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase n’est pas configuré (voir .env.example).');
  return supabase;
}
