/**
 * Edge Function « import-hellofresh » (Deno, Supabase).
 *
 * Reçoit { url } d'un utilisateur connecté, télécharge la page de recette hellofresh.fr
 * et renvoie { recipe } (voir extract.ts) ou { error } avec un message en français.
 *
 * Sécurité :
 * - la fonction vérifie elle-même la session auprès de Supabase Auth (`requireUser`) :
 *   la vérification de jeton de la plateforme (verify_jwt) laisse passer un appel fait
 *   avec la seule clé publique, constaté le 12/11/2026 ;
 * - seules les adresses https://www.hellofresh.fr/recipes/… sont acceptées, y compris
 *   après chaque redirection : la fonction ne peut pas servir à interroger un autre site.
 *
 * Déploiement : voir README (« Fonction d'import HelloFresh »).
 */
import { extractRecipe, ImportError, normalizeRecipeUrl } from './extract.ts';

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const MAX_PAGE_BYTES = 5_000_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * Refuse l'appel si la requête ne porte pas la session d'un utilisateur connecté.
 * Demande à Supabase Auth de valider le jeton (variables fournies par la plateforme).
 */
async function requireUser(request: Request): Promise<void> {
  const authorization = request.headers.get('authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization.startsWith('Bearer ') || !supabaseUrl || !anonKey) {
    throw new ImportError('Connectez-vous pour importer une recette.', 401);
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new ImportError('Connectez-vous pour importer une recette.', 401);
}

/** Télécharge la page en suivant les redirections, sans jamais quitter hellofresh.fr. */
async function fetchRecipePage(url: string): Promise<{ html: string; finalUrl: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Popote/1.0; carnet de recettes personnel)',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      // Une redirection hors des pages de recettes hellofresh.fr est refusée ici.
      current = normalizeRecipeUrl(new URL(location, current).toString());
      continue;
    }
    if (response.status === 404) {
      throw new ImportError('Cette recette n’existe pas (ou plus) sur hellofresh.fr.', 404);
    }
    if (!response.ok) {
      throw new ImportError(
        `hellofresh.fr a répondu par une erreur (${response.status}). Réessayez plus tard.`,
        502,
      );
    }
    const html = await response.text();
    if (html.length > MAX_PAGE_BYTES) throw new ImportError('Page trop volumineuse.', 502);
    return { html, finalUrl: current };
  }
  throw new ImportError('Trop de redirections depuis hellofresh.fr.', 502);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  try {
    await requireUser(request);
    const body: unknown = await request.json().catch(() => null);
    const input = (body as { url?: unknown } | null)?.url;
    if (typeof input !== 'string') {
      throw new ImportError('Indiquez le lien de la recette.', 400);
    }
    const { html, finalUrl } = await fetchRecipePage(normalizeRecipeUrl(input));
    return json({ recipe: extractRecipe(html, finalUrl) });
  } catch (error) {
    if (error instanceof ImportError) return json({ error: error.message }, error.status);
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return json({ error: 'hellofresh.fr ne répond pas. Réessayez dans un instant.' }, 504);
    }
    console.error('import-hellofresh', error);
    return json({ error: 'L’import a échoué de façon inattendue.' }, 500);
  }
});
