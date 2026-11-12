/**
 * Import d'une recette par lien hellofresh.fr, via l'Edge Function « import-hellofresh ».
 *
 * La fonction fait le travail réseau (la page HelloFresh n'est pas lisible depuis le
 * navigateur à cause des règles CORS) ; l'app valide sa réponse avec Zod avant de
 * l'afficher dans le formulaire de relecture.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSupabase } from './supabase';

const importedRecipeSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  sourceUrl: z.url(),
  hellofreshId: z.string().nullable(),
  prepMinutes: z.number().nullable(),
  totalMinutes: z.number().nullable(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  servings: z.number().nullable(),
  tags: z.array(z.string()),
  allergens: z.array(z.string()),
  utensils: z.array(z.string()),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      shipped: z.boolean().nullable(),
    }),
  ),
  steps: z.array(z.object({ text: z.string(), imageUrl: z.string().nullable() })),
  nutrition: z.record(z.string(), z.number()).nullable(),
  coverImageUrl: z.string().nullable(),
  extractedFrom: z.enum(['next-data', 'json-ld']),
});

export type ImportedRecipe = z.infer<typeof importedRecipeSchema>;

/**
 * Récupère et valide la recette d'un lien hellofresh.fr.
 * @throws Error avec un message prêt à afficher
 */
export async function importFromHellofresh(url: string): Promise<ImportedRecipe> {
  const { data, error } = await getSupabase().functions.invoke<{ recipe?: unknown }>(
    'import-hellofresh',
    { body: { url } },
  );
  if (error) {
    // La fonction renvoie { error: "message en français" } avec un statut d'erreur.
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) throw new Error(body.error);
    }
    throw new Error('Le service d’import ne répond pas. Vérifiez la connexion internet.');
  }
  const parsed = importedRecipeSchema.safeParse(data?.recipe);
  if (!parsed.success) {
    throw new Error('La réponse du service d’import est incomplète. Utilisez la saisie manuelle.');
  }
  return parsed.data;
}
