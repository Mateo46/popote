/**
 * « Mon frigo » (pantry_items) et basiques toujours disponibles (pantry_staples),
 * partagés par le foyer. La clé primaire est la clé d'ingrédient : ajouter deux fois
 * « Échalotes » puis « échalote » ne crée qu'une ligne.
 */
import { ingredientKey } from '../domain/ingredients';
import { getSupabase } from './supabase';

export interface PantryEntry {
  normalized: string;
  label: string;
}

export type PantryTable = 'pantry_items' | 'pantry_staples';

/** « échalotes » → « Échalotes » : on garde la saisie, avec une majuscule. */
function cleanLabel(label: string): string {
  const text = label.trim().replace(/\s+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function listEntries(table: PantryTable): Promise<PantryEntry[]> {
  const { data, error } = await getSupabase().from(table).select('normalized, label');
  if (error) throw new Error(error.message);
  return (data as PantryEntry[]).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Ajoute un ingrédient ; sans effet s'il y est déjà (même clé). */
export async function addEntry(table: PantryTable, label: string): Promise<void> {
  const normalized = ingredientKey(label);
  if (!normalized) return;
  const { error } = await getSupabase()
    .from(table)
    .upsert(
      { normalized, label: cleanLabel(label) },
      { onConflict: 'normalized', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeEntry(table: PantryTable, normalized: string): Promise<void> {
  const { error } = await getSupabase().from(table).delete().eq('normalized', normalized);
  if (error) throw new Error(error.message);
}

/** Vide « Mon frigo » (les basiques ne sont pas touchés). */
export async function clearPantry(): Promise<void> {
  // PostgREST exige un filtre pour un DELETE : on cible toutes les lignes explicitement.
  const { error } = await getSupabase().from('pantry_items').delete().neq('normalized', '');
  if (error) throw new Error(error.message);
}
