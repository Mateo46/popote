/**
 * Accès aux recettes, à leur historique et à leurs photos dans Supabase.
 *
 * Toutes les recettes sont chargées d'un coup (quelques centaines au plus) : la recherche
 * et « Mon frigo » travaillent ensuite en mémoire, sans aller-retour réseau.
 * Les lignes reçues sont validées par Zod puis converties en `Recipe` (camelCase).
 */
import { z } from 'zod';
import {
  ingredientSchema,
  nutritionSchema,
  recipeSources,
  stepSchema,
  type Photo,
  type Recipe,
  type RecipeInput,
} from '../domain/recipe';
import { prepareImage, thumbPath } from './images';
import { getSupabase } from './supabase';

const PHOTO_BUCKET = 'photos';

// Deux clés étrangères relient recipes et recipe_photos (photos d'une recette, et photo
// de couverture) : on nomme la contrainte pour que PostgREST sache laquelle suivre.
const RECIPE_SELECT = `
  *,
  photos:recipe_photos!recipe_photos_recipe_id_fkey ( id, path, kind, created_at ),
  cook_log ( id, cooked_on )
`;

const rowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  source: z.enum(recipeSources),
  source_url: z.string().nullable(),
  hellofresh_id: z.string().nullable(),
  prep_minutes: z.number().nullable(),
  total_minutes: z.number().nullable(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  servings: z.number().nullable(),
  tags: z.array(z.string()),
  allergens: z.array(z.string()),
  utensils: z.array(z.string()),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema),
  nutrition: nutritionSchema.nullable(),
  // Postgres renvoie un numeric : nombre ou chaîne selon la configuration.
  rating: z.coerce.number().nullable(),
  comment: z.string().nullable(),
  cover_photo_id: z.string().nullable(),
  photos: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
      kind: z.enum(['source', 'scan', 'user']),
      created_at: z.string(),
    }),
  ),
  cook_log: z.array(z.object({ id: z.string(), cooked_on: z.string() })),
});

type RecipeRow = z.infer<typeof rowSchema>;

function fromRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    source: row.source,
    sourceUrl: row.source_url,
    hellofreshId: row.hellofresh_id,
    prepMinutes: row.prep_minutes,
    totalMinutes: row.total_minutes,
    difficulty: row.difficulty,
    servings: row.servings,
    tags: row.tags,
    allergens: row.allergens,
    utensils: row.utensils,
    ingredients: row.ingredients,
    steps: row.steps,
    nutrition: row.nutrition,
    rating: row.rating,
    comment: row.comment,
    coverPhotoId: row.cover_photo_id,
    photos: row.photos
      .map((p) => ({ id: p.id, path: p.path, kind: p.kind, createdAt: p.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    cookLog: row.cook_log
      .map((entry) => ({ id: entry.id, cookedOn: entry.cooked_on }))
      .sort((a, b) => b.cookedOn.localeCompare(a.cookedOn)),
  };
}

function toRow(input: RecipeInput) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    source: input.source,
    source_url: input.sourceUrl,
    hellofresh_id: input.hellofreshId,
    prep_minutes: input.prepMinutes,
    total_minutes: input.totalMinutes,
    difficulty: input.difficulty,
    servings: input.servings,
    tags: input.tags,
    allergens: input.allergens,
    utensils: input.utensils,
    ingredients: input.ingredients,
    steps: input.steps,
    nutrition: input.nutrition,
  };
}

/** Lève une erreur lisible à partir d'une erreur Supabase. */
function check<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) {
    if (result.error.code === '23505') {
      throw new Error('Cette recette existe déjà (même lien HelloFresh).');
    }
    throw new Error(result.error.message);
  }
  return result.data;
}

/** Toutes les recettes du foyer, avec photos et historique. */
export async function listRecipes(): Promise<Recipe[]> {
  const rows = check(await getSupabase().from('recipes').select(RECIPE_SELECT));
  return z.array(rowSchema).parse(rows).map(fromRow);
}

/** Crée une recette et renvoie son identifiant. */
export async function createRecipe(input: RecipeInput): Promise<string> {
  const row = check(await getSupabase().from('recipes').insert(toRow(input)).select('id').single());
  return (row as { id: string }).id;
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<void> {
  check(await getSupabase().from('recipes').update(toRow(input)).eq('id', id));
}

/** Supprime la recette, ses lignes liées (cascade) et ses fichiers photo. */
export async function deleteRecipe(recipe: Pick<Recipe, 'id' | 'photos'>): Promise<void> {
  const files = recipe.photos.flatMap((photo) => [photo.path, thumbPath(photo.path)]);
  if (files.length) check(await getSupabase().storage.from(PHOTO_BUCKET).remove(files));
  check(await getSupabase().from('recipes').delete().eq('id', recipe.id));
}

/** Note commune, de 0 à 5 par demi-points ; `null` efface la note. */
export async function setRating(id: string, rating: number | null): Promise<void> {
  check(await getSupabase().from('recipes').update({ rating }).eq('id', id));
}

export async function setComment(id: string, comment: string | null): Promise<void> {
  check(await getSupabase().from('recipes').update({ comment }).eq('id', id));
}

/** Ajoute une date à l'historique « cuisinée le… » (date locale AAAA-MM-JJ). */
export async function addCookEntry(recipeId: string, cookedOn: string): Promise<void> {
  check(await getSupabase().from('cook_log').insert({ recipe_id: recipeId, cooked_on: cookedOn }));
}

export async function deleteCookEntry(entryId: string): Promise<void> {
  check(await getSupabase().from('cook_log').delete().eq('id', entryId));
}

/**
 * Redimensionne puis envoie une photo (et sa vignette), et l'enregistre.
 * `makeCover` : la photo devient la couverture (première photo d'une recette qui n'en a pas).
 */
export async function uploadPhoto(
  recipeId: string,
  file: Blob,
  kind: Photo['kind'],
  makeCover: boolean,
): Promise<void> {
  const supabase = getSupabase();
  const { photo, thumb } = await prepareImage(file);
  const photoId = crypto.randomUUID();
  const path = `${recipeId}/${photoId}.jpg`;
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const options = { contentType: 'image/jpeg', upsert: false };

  check(await bucket.upload(path, photo, options));
  check(await bucket.upload(thumbPath(path), thumb, options));
  check(
    await supabase.from('recipe_photos').insert({ id: photoId, recipe_id: recipeId, path, kind }),
  );
  if (makeCover) await setCover(recipeId, photoId);
}

export async function setCover(recipeId: string, photoId: string | null): Promise<void> {
  check(await getSupabase().from('recipes').update({ cover_photo_id: photoId }).eq('id', recipeId));
}

/** Supprime une photo (fichiers et ligne). Si c'était la couverture, elle est retirée. */
export async function deletePhoto(photo: Pick<Photo, 'id' | 'path'>): Promise<void> {
  const supabase = getSupabase();
  check(await supabase.storage.from(PHOTO_BUCKET).remove([photo.path, thumbPath(photo.path)]));
  check(await supabase.from('recipe_photos').delete().eq('id', photo.id));
}

/** Durée de validité des URL signées (le bucket est privé). */
export const SIGNED_URL_SECONDS = 60 * 60;

/** URL temporaires pour afficher des photos privées, indexées par chemin. */
export async function signPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const signed = check(
    await getSupabase().storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS),
  );
  const urls: Record<string, string> = {};
  for (const item of signed ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
