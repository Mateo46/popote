/**
 * Faux serveur Supabase pour les tests de parcours : authentification, recettes,
 * frigo et basiques, avec l'enregistrement des modifications reçues.
 */
import type { Page, Request } from '@playwright/test';

export const SUPABASE = 'http://supabase.test';

/** Jeton au format JWT (non signé : l'app ne le vérifie pas, Supabase le ferait). */
function fakeJwt(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'user-test', role: 'authenticated', exp })}.signature`;
}

const user = {
  id: 'user-test',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@popote.test',
};

function recipeRow(id: string, patch: Record<string, unknown>) {
  return {
    id,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    title: id,
    subtitle: null,
    description: null,
    source: 'hellofresh',
    source_url: null,
    hellofresh_id: null,
    prep_minutes: null,
    total_minutes: 35,
    difficulty: 2,
    servings: 2,
    tags: [],
    allergens: [],
    utensils: [],
    ingredients: [],
    steps: [{ text: 'Préchauffez le four à 200 °C.', image_path: null }],
    nutrition: { kcal: 600 },
    rating: null,
    comment: null,
    cover_photo_id: null,
    photos: [],
    cook_log: [],
    ...patch,
  };
}

const ingredient = (name: string, shipped = true) => ({
  name,
  normalized: name.toLowerCase(),
  quantity: 1,
  unit: null,
  shipped,
});

export const recipes = [
  recipeRow('r-bobun', {
    title: 'Bò bún vietnamien au bœuf sauté',
    subtitle: 'avec des nouilles de riz & des cacahuètes',
    rating: 4.5,
    ingredients: [ingredient('Émincés de bœuf'), ingredient('Carotte'), ingredient('Menthe')],
  }),
  recipeRow('r-azteca', {
    title: 'Azteca Bowl : poulet, avocat & sauce yaourt',
    subtitle: 'garni de patate douce & pickles d’oignon',
    ingredients: [ingredient('Patate douce'), ingredient('Avocat'), ingredient('Blanc de poulet')],
  }),
];

export interface MockState {
  /** Corps JSON des requêtes PATCH reçues sur /recipes. */
  recipePatches: unknown[];
}

/** Installe les réponses simulées sur la page. */
export async function mockSupabase(page: Page): Promise<MockState> {
  const state: MockState = { recipePatches: [] };
  // Copie propre à chaque test : les modifications d'un test ne fuient pas dans un autre.
  const rows = recipes.map((row) => ({ ...row }));
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route(`${SUPABASE}/auth/v1/**`, (route) => {
    const url = route.request().url();
    if (url.includes('/token')) {
      const token = fakeJwt();
      return route.fulfill(
        json({
          access_token: token,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'refresh-test',
          user,
        }),
      );
    }
    if (url.includes('/logout')) return route.fulfill({ status: 204 });
    return route.fulfill(json(user));
  });

  await page.route(`${SUPABASE}/rest/v1/**`, (route) => {
    const request: Request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/recipes')) {
      if (request.method() === 'PATCH') {
        // Comme Supabase : la modification est appliquée, et le rechargement qui suit
        // renvoie la recette à jour.
        const patch = request.postDataJSON() as Record<string, unknown>;
        state.recipePatches.push(patch);
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const index = rows.findIndex((row) => row.id === id);
        if (index >= 0) rows[index] = { ...rows[index], ...patch } as (typeof rows)[number];
        return route.fulfill({ status: 204 });
      }
      return route.fulfill(json(rows));
    }
    // Frigo et basiques : vides.
    return route.fulfill(json([]));
  });

  await page.route(`${SUPABASE}/storage/v1/**`, (route) => route.fulfill(json([])));
  return state;
}
