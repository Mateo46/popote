/**
 * Modèle d'une recette : types et schémas Zod.
 *
 * Les schémas valident à la fois ce qui vient de la base (JSONB non typé par Postgres)
 * et ce que l'utilisateur saisit dans le formulaire. Les objets stockés en JSONB
 * (ingrédients, étapes, nutrition) gardent les noms de champs documentés dans la
 * migration SQL ; la recette elle-même est exposée en camelCase.
 */
import { z } from 'zod';

/** Arrondi à la demi-unité : la note va de 0 à 5 par pas de 0,5. */
export const ratingSchema = z
  .number()
  .min(0)
  .max(5)
  .refine((value) => Number.isInteger(value * 2), 'La note avance par demi-étoile.');

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Nom d’ingrédient vide.'),
  /** Nom normalisé (voir normalize.ts), pour la recherche et « Mon frigo ». */
  normalized: z.string(),
  /** `null` : quantité non précisée (« selon le goût »). */
  quantity: z.number().nonnegative().nullable(),
  unit: z.string().nullable(),
  /** HelloFresh : `true` livré dans la box, `false` à avoir chez soi, `null` inconnu. */
  shipped: z.boolean().nullable(),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const stepSchema = z.object({
  text: z.string().trim().min(1, 'Étape vide.'),
  /** Chemin d'une photo d'étape dans le stockage, si elle existe. */
  image_path: z.string().nullable(),
});
export type Step = z.infer<typeof stepSchema>;

const nutrient = z.number().nonnegative().nullable().optional();

/** Valeurs nutritionnelles par portion. */
export const nutritionSchema = z.object({
  kcal: nutrient,
  fat: nutrient,
  saturated_fat: nutrient,
  carbs: nutrient,
  sugars: nutrient,
  fiber: nutrient,
  protein: nutrient,
  salt: nutrient,
  /** Poids d'une portion en grammes. */
  serving_grams: nutrient,
});
export type Nutrition = z.infer<typeof nutritionSchema>;
export type NutrientKey = Exclude<keyof Nutrition, 'serving_grams'>;

export const recipeSources = ['hellofresh', 'scan', 'manual'] as const;
export type RecipeSource = (typeof recipeSources)[number];

export type PhotoKind = 'source' | 'scan' | 'user';

export interface Photo {
  id: string;
  path: string;
  kind: PhotoKind;
  createdAt: string;
}

export interface CookEntry {
  id: string;
  /** Date locale au format AAAA-MM-JJ. */
  cookedOn: string;
}

export interface Recipe {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  source: RecipeSource;
  sourceUrl: string | null;
  hellofreshId: string | null;
  prepMinutes: number | null;
  totalMinutes: number | null;
  /** 1 facile, 2 moyen, 3 difficile. */
  difficulty: 1 | 2 | 3 | null;
  servings: number | null;
  tags: string[];
  allergens: string[];
  utensils: string[];
  ingredients: Ingredient[];
  steps: Step[];
  nutrition: Nutrition | null;
  rating: number | null;
  comment: string | null;
  coverPhotoId: string | null;
  photos: Photo[];
  /** Historique trié du plus récent au plus ancien. */
  cookLog: CookEntry[];
}

/** Champs modifiables d'une recette (création et modification). */
export type RecipeInput = Omit<
  Recipe,
  'id' | 'createdAt' | 'updatedAt' | 'rating' | 'comment' | 'coverPhotoId' | 'photos' | 'cookLog'
>;

/**
 * Durée affichée. HelloFresh remplit `prepTime` et `totalTime` de façon incohérente
 * (voir docs/architecture.md) : on retient la plus grande des deux.
 */
export function durationMinutes(recipe: Pick<Recipe, 'prepMinutes' | 'totalMinutes'>) {
  const values = [recipe.prepMinutes, recipe.totalMinutes].filter(
    (value): value is number => value !== null && value > 0,
  );
  return values.length ? Math.max(...values) : null;
}

export const difficultyLabels = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' } as const;

/** Photo de couverture : celle choisie, sinon la première du site, sinon la première. */
export function coverPhoto(recipe: Pick<Recipe, 'coverPhotoId' | 'photos'>): Photo | null {
  return (
    recipe.photos.find((photo) => photo.id === recipe.coverPhotoId) ??
    recipe.photos.find((photo) => photo.kind === 'source') ??
    recipe.photos[0] ??
    null
  );
}

/** Ingrédients séparés comme sur la fiche : livrés d'un côté, « à avoir chez soi » de l'autre. */
export function splitIngredients(ingredients: Ingredient[]) {
  return {
    main: ingredients.filter((ingredient) => ingredient.shipped !== false),
    pantry: ingredients.filter((ingredient) => ingredient.shipped === false),
  };
}
