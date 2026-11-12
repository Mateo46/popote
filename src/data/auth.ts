/**
 * Authentification : état de session partagé et actions de connexion / déconnexion.
 *
 * L'état est tenu dans un petit « store » externe lu avec `useSyncExternalStore` :
 * pas de contexte React à fournir, et un seul abonnement à Supabase pour toute l'app.
 */
import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { strings } from '../strings';
import { getSupabase, supabase } from './supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; email: string; userId: string };

let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();

function setState(next: AuthState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function fromSession(session: Session | null): AuthState {
  if (!session) return { status: 'signedOut' };
  return { status: 'signedIn', email: session.user.email ?? '', userId: session.user.id };
}

if (supabase) {
  // Supabase émet INITIAL_SESSION au démarrage (session restaurée ou absente),
  // puis un évènement à chaque connexion, déconnexion ou renouvellement de jeton.
  supabase.auth.onAuthStateChange((_event, session) => setState(fromSession(session)));
} else {
  state = { status: 'signedOut' };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** État de connexion courant ; le composant se met à jour à chaque changement. */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state);
}

/**
 * Connecte un membre du foyer.
 * Renvoie `null` en cas de succès, sinon un message d'erreur prêt à afficher.
 */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (!error) return null;
  if (error.code === 'invalid_credentials') return strings.auth.invalidCredentials;
  if (error.status === 0 || error.name === 'AuthRetryableFetchError') return strings.auth.offline;
  return strings.auth.unknownError;
}

/** Déconnecte l'appareil courant (les autres appareils restent connectés). */
export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut({ scope: 'local' });
}
