/**
 * Hooks React des données (TanStack Query).
 *
 * Une seule requête, `['recipes']`, contient toutes les recettes : la fiche d'une recette
 * lit dans ce cache. Après chaque modification, le cache est invalidé ; il est aussi
 * rechargé quand l'app revient au premier plan, ce qui fait apparaître les changements
 * faits sur l'autre téléphone.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Photo, Recipe, RecipeInput } from '../domain/recipe';
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

/**
 * Envoie une ou plusieurs photos, l'une après l'autre. Si la recette n'a pas encore de
 * couverture, la première photo envoyée le devient.
 */
export function useUploadPhotos() {
  const onSettled = useInvalidate();
  return useMutation({
    mutationFn: async ({
      recipe,
      files,
      kind,
    }: {
      recipe: Pick<Recipe, 'id' | 'coverPhotoId'>;
      files: Blob[];
      kind: Photo['kind'];
    }) => {
      for (const [index, file] of files.entries()) {
        await api.uploadPhoto(recipe.id, file, kind, index === 0 && !recipe.coverPhotoId);
      }
    },
    onSettled,
  });
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
