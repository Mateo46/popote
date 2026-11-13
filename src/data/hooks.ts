/**
 * Hooks React des données (TanStack Query).
 *
 * Une seule requête, `['recipes']`, contient toutes les recettes : la fiche d'une recette
 * lit dans ce cache. Après chaque modification, le cache est invalidé ; il est aussi
 * rechargé quand l'app revient au premier plan, ce qui fait apparaître les changements
 * faits sur l'autre téléphone.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Photo, Recipe, RecipeInput, Step } from '../domain/recipe';
import { signOut } from './auth';
import { fetchRemoteImage } from './images';
import { importFromHellofresh } from './importHellofresh';
import { clearOfflineCache } from './offline';
import * as pantry from './pantry';
import * as api from './recipes';

const recipesKey = ['recipes'] as const;

export function useRecipes() {
  return useQuery({ queryKey: recipesKey, queryFn: api.listRecipes });
}

/** Une recette du cache ; `undefined` tant que la liste charge ou si l'id est inconnu. */
export function useRecipe(id: string | undefined) {
  const query = useRecipes();
  return { ...query, data: query.data?.find((recipe) => recipe.id === id) };
}

/** Invalide la liste à la fin d'une mutation, qu'elle réussisse ou non. */
function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: recipesKey });
}

/**
 * Applique tout de suite une modification au cache (affichage immédiat), puis
 * revient en arrière si le serveur refuse.
 */
function useOptimisticRecipe() {
  const client = useQueryClient();
  return async (id: string, patch: Partial<Recipe>) => {
    await client.cancelQueries({ queryKey: recipesKey });
    const previous = client.getQueryData<Recipe[]>(recipesKey);
    client.setQueryData<Recipe[]>(recipesKey, (list) =>
      list?.map((recipe) => (recipe.id === id ? { ...recipe, ...patch } : recipe)),
    );
    return () => client.setQueryData(recipesKey, previous);
  };
}

export function useCreateRecipe() {
  const onSettled = useInvalidate();
  return useMutation({ mutationFn: api.createRecipe, onSettled });
}

export function useUpdateRecipe() {
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecipeInput }) => api.updateRecipe(id, input),
    onSettled,
  });
}

export function useDeleteRecipe() {
  const onSettled = useInvalidate();
  return useMutation({ mutationFn: api.deleteRecipe, onSettled });
}

export function useSetRating() {
  const optimistic = useOptimisticRecipe();
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number | null }) =>
      api.setRating(id, rating),
    onMutate: ({ id, rating }) => optimistic(id, { rating }),
    onError: (_error, _vars, rollback) => rollback?.(),
    onSettled,
  });
}

export function useSetComment() {
  const optimistic = useOptimisticRecipe();
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string | null }) =>
      api.setComment(id, comment),
    onMutate: ({ id, comment }) => optimistic(id, { comment }),
    onError: (_error, _vars, rollback) => rollback?.(),
    onSettled,
  });
}

export function useAddCookEntry() {
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: ({ recipeId, cookedOn }: { recipeId: string; cookedOn: string }) =>
      api.addCookEntry(recipeId, cookedOn),
    onSettled,
  });
}

export function useDeleteCookEntry() {
  const onSettled = useInvalidate();
  return useMutation({ mutationFn: api.deleteCookEntry, onSettled });
}

/** Photo à envoyer : un fichier de l'appareil, ou l'adresse d'une image HelloFresh. */
export interface PhotoUpload {
  source: Blob | string;
  kind: Photo['kind'];
}

/**
 * Envoie une ou plusieurs photos, l'une après l'autre. Si la recette n'a pas encore de
 * couverture, la première photo du plat envoyée le devient (pas une photo de feuillet).
 */
export function useUploadPhotos() {
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: async ({
      recipe,
      photos,
    }: {
      recipe: Pick<Recipe, 'id' | 'coverPhotoId'>;
      photos: PhotoUpload[];
    }) => {
      // La couverture est la première photo du plat (site ou perso), jamais un feuillet.
      let hasCover = recipe.coverPhotoId !== null;
      for (const photo of photos) {
        const file =
          typeof photo.source === 'string' ? await fetchRemoteImage(photo.source) : photo.source;
        const makeCover = !hasCover && photo.kind !== 'scan';
        await api.uploadPhoto(recipe.id, file, photo.kind, makeCover);
        hasCover ||= makeCover;
      }
    },
    onSettled,
  });
}

/** Copie les photos d'étapes d'une recette importée (voir `copyStepImages`). */
export function useCopyStepImages() {
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: ({
      recipeId,
      steps,
      urls,
    }: {
      recipeId: string;
      steps: Step[];
      urls: (string | null)[];
    }) => api.copyStepImages(recipeId, steps, urls),
    onSettled,
  });
}

/** Import d'une recette par lien hellofresh.fr (aucune écriture : relecture ensuite). */
export function useImportHellofresh() {
  return useMutation({ mutationFn: importFromHellofresh });
}

export function useDeletePhoto() {
  const onSettled = useInvalidate();
  return useMutation({ mutationFn: api.deletePhoto, onSettled });
}

export function useSetCover() {
  const optimistic = useOptimisticRecipe();
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: ({ recipeId, photoId }: { recipeId: string; photoId: string }) =>
      api.setCover(recipeId, photoId),
    onMutate: ({ recipeId, photoId }) => optimistic(recipeId, { coverPhotoId: photoId }),
    onError: (_error, _vars, rollback) => rollback?.(),
    onSettled,
  });
}

/**
 * URL signées pour une liste de chemins de photos (bucket privé).
 * Gardées 50 minutes en cache pour une validité de 60 minutes.
 */
export function usePhotoUrls(paths: string[]) {
  const sorted = [...new Set(paths)].sort();
  return useQuery({
    queryKey: ['photo-urls', sorted],
    queryFn: () => api.signPhotoUrls(sorted),
    enabled: sorted.length > 0,
    staleTime: (api.SIGNED_URL_SECONDS - 600) * 1000,
    gcTime: (api.SIGNED_URL_SECONDS - 600) * 1000,
  });
}

// ---------------------------------------------------------------------------
// « Mon frigo » et basiques
// ---------------------------------------------------------------------------

/** Contenu de « Mon frigo » ou liste des basiques, selon la table. */
export function usePantryEntries(table: pantry.PantryTable) {
  return useQuery({ queryKey: [table], queryFn: () => pantry.listEntries(table) });
}

/**
 * Ajout et retrait avec mise à jour immédiate de l'affichage : on tape vite plusieurs
 * ingrédients d'affilée, l'écran ne doit pas attendre le serveur à chaque fois.
 */
export function usePantryMutations(table: pantry.PantryTable) {
  const client = useQueryClient();
  const key = [table];
  const settle = () => client.invalidateQueries({ queryKey: key });

  async function optimistic(update: (list: pantry.PantryEntry[]) => pantry.PantryEntry[]) {
    await client.cancelQueries({ queryKey: key });
    const previous = client.getQueryData<pantry.PantryEntry[]>(key);
    client.setQueryData<pantry.PantryEntry[]>(key, (list) => update(list ?? []));
    return () => client.setQueryData(key, previous);
  }

  const add = useMutation({
    mutationFn: (label: string) => pantry.addEntry(table, label),
    onMutate: (label: string) =>
      optimistic((list) => [...list, { normalized: `nouveau:${label}`, label }]),
    onError: (_error, _label, rollback) => rollback?.(),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (normalized: string) => pantry.removeEntry(table, normalized),
    onMutate: (normalized: string) =>
      optimistic((list) => list.filter((entry) => entry.normalized !== normalized)),
    onError: (_error, _normalized, rollback) => rollback?.(),
    onSettled: settle,
  });

  const clear = useMutation({
    mutationFn: pantry.clearPantry,
    onMutate: () => optimistic(() => []),
    onError: (_error, _vars, rollback) => rollback?.(),
    onSettled: settle,
  });

  return { add, remove, clear };
}

/**
 * Déconnexion de l'appareil : session fermée, cache en mémoire vidé et cache hors ligne
 * effacé, pour que les recettes ne restent pas sur un téléphone déconnecté.
 */
export function useSignOut() {
  const client = useQueryClient();
  return async () => {
    await signOut();
    client.clear();
    await clearOfflineCache();
  };
}
