/**
 * Extraction d'une recette depuis le HTML d'une page hellofresh.fr.
 *
 * Logique pure (ni réseau, ni API Deno) : testée avec Vitest sur des fixtures et
 * exécutée telle quelle par l'Edge Function. Deux sources, dans cet ordre
 * (voir docs/architecture.md, phase 1) :
 *  1. le bloc `__NEXT_DATA__` (props.pageProps.ssrPayload.recipe), le plus complet ;
 *  2. le JSON-LD schema.org/Recipe, en repli si HelloFresh change sa structure.
 */

export interface ImportedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** `false` : à avoir chez soi (sel, huile, œuf…). */
  shipped: boolean | null;
}

export interface ImportedStep {
  text: string;
  /** Photo de l'étape sur le CDN HelloFresh (copiée ensuite dans le stockage par l'app). */
  imageUrl: string | null;
}

export interface ImportedRecipe {
  title: string;
  subtitle: string | null;
  description: string | null;
  sourceUrl: string;
  hellofreshId: string | null;
  prepMinutes: number | null;
  totalMinutes: number | null;
  difficulty: 1 | 2 | 3 | null;
  servings: number | null;
  tags: string[];
  allergens: string[];
  utensils: string[];
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
  nutrition: Record<string, number> | null;
  coverImageUrl: string | null;
  /** Source effectivement utilisée, utile au diagnostic. */
  extractedFrom: 'next-data' | 'json-ld';
}

/** Erreur à montrer telle quelle à l'utilisateur. */
export class ImportError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

const IMAGE_CDN = 'https://img.hellofresh.com';
/** Taille demandée au CDN : l'app redimensionne ensuite à 1600 px maximum. */
const COVER_TRANSFORM = 'w_1600,q_75,f_jpg';
const STEP_TRANSFORM = 'w_800,q_75,f_jpg';

/** Phrase ajoutée par HelloFresh en tête des étapes ; inutile hors de leur fiche papier. */
const BOILERPLATE = /^veillez à bien respecter les quantités/i;

/** Tags techniques de HelloFresh, sans intérêt pour le foyer. */
const IGNORED_TAGS = new Set(['seo', 'bestseller', 'worldwide']);

/** Correspondance intitulé HelloFresh → clé du modèle de nutrition. */
const NUTRIENTS: Record<string, string> = {
  'énergie (kcal)': 'kcal',
  'matières grasses': 'fat',
  'dont acides gras saturés': 'saturated_fat',
  glucides: 'carbs',
  'dont sucres': 'sugars',
  'fibres alimentaires': 'fiber',
  protéines: 'protein',
  sel: 'salt',
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Décode les entités HTML (&#39;, &amp;, &nbsp;…). */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Texte d'une étape : HTML et Markdown retirés, phrase standard supprimée, une phrase
 * par élément de liste, espaces normalisés.
 */
export function cleanStepText(raw: string): string {
  const lines = decodeEntities(
    raw
      .replace(/<\/(li|p)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*[-*•]\s+/, '') // puces Markdown
        .replace(/\*\*(.+?)\*\*/g, '$1') // gras Markdown
        .replace(/[\u00a0\u202f\u2009]/g, ' ') // espaces insécables
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => line && !BOILERPLATE.test(line));
  return lines.join(' ');
}

/** « PT35M » → 35 ; « PT1H10M » → 70 ; absent ou nul → null. */
export function parseDuration(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!match) return null;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  return minutes > 0 ? minutes : null;
}

/** Identifiant HelloFresh (24 caractères hexadécimaux) trouvé dans une URL ou un id. */
export function hellofreshIdFrom(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const match = /([0-9a-f]{24})(?:-[a-z]{2}-[A-Z]{2})?\/?$/.exec(candidate);
    if (match?.[1]) return match[1];
  }
  return null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const names = (list: unknown): string[] =>
  Array.isArray(list)
    ? [
        ...new Set(
          list.map((item) => text((item as { name?: unknown })?.name)).filter((n) => n !== null),
        ),
      ]
    : [];

function imageUrl(path: unknown, transform: string): string | null {
  if (typeof path !== 'string' || !path) return null;
  if (path.startsWith('http')) return path;
  return `${IMAGE_CDN}/${transform}/hellofresh_s3${path.startsWith('/') ? '' : '/'}${path}`;
}

// ---------------------------------------------------------------------------
// Source 1 : __NEXT_DATA__
// ---------------------------------------------------------------------------

interface NextRecipe {
  id?: string;
  name?: string;
  headline?: string;
  descriptionMarkdown?: string;
  description?: string;
  difficulty?: number;
  prepTime?: string;
  totalTime?: string;
  servingSize?: number;
  websiteUrl?: string;
  imagePath?: string;
  tags?: { name?: string }[];
  allergens?: { name?: string; tracesOf?: boolean }[];
  utensils?: { name?: string }[];
  ingredients?: { id?: string; name?: string; shipped?: boolean }[];
  yields?: { yields?: number; ingredients?: { id?: string; amount?: number; unit?: string }[] }[];
  steps?: {
    index?: number;
    instructionsMarkdown?: string;
    instructions?: string;
    images?: { path?: string }[];
  }[];
  nutrition?: { name?: string; amount?: number; unit?: string }[];
}

function findNextRecipe(html: string): NextRecipe | null {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) return null;
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }
  const direct = (data as { props?: { pageProps?: { ssrPayload?: { recipe?: NextRecipe } } } })
    ?.props?.pageProps?.ssrPayload?.recipe;
  if (direct?.ingredients && direct.steps) return direct;
  return null;
}

/** Quantités pour 2 personnes (taille de box du foyer), sinon la plus petite proposée. */
function pickYield(recipe: NextRecipe) {
  const yields = [...(recipe.yields ?? [])].sort((a, b) => (a.yields ?? 0) - (b.yields ?? 0));
  return yields.find((y) => y.yields === 2) ?? yields[0] ?? null;
}

function fromNextData(recipe: NextRecipe, pageUrl: string): ImportedRecipe {
  const title = text(recipe.name);
  if (!title) throw new ImportError('La page ne contient pas de titre de recette.');

  const chosen = pickYield(recipe);
  const amounts = new Map((chosen?.ingredients ?? []).map((item) => [item.id, item]));
  const ingredients: ImportedIngredient[] = (recipe.ingredients ?? [])
    .filter((item) => text(item.name))
    .map((item) => {
      const amount = amounts.get(item.id);
      return {
        name: text(item.name) as string,
        quantity: typeof amount?.amount === 'number' ? round2(amount.amount) : null,
        unit: text(amount?.unit),
        shipped: typeof item.shipped === 'boolean' ? item.shipped : null,
      };
    });

  const steps: ImportedStep[] = [...(recipe.steps ?? [])]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((step) => ({
      text: cleanStepText(step.instructionsMarkdown ?? step.instructions ?? ''),
      imageUrl: imageUrl(step.images?.[0]?.path, STEP_TRANSFORM),
    }))
    .filter((step) => step.text);

  const nutrition: Record<string, number> = {};
  for (const item of recipe.nutrition ?? []) {
    const key = NUTRIENTS[(item.name ?? '').trim().toLowerCase()];
    if (key && typeof item.amount === 'number') nutrition[key] = round2(item.amount);
  }
  if (typeof recipe.servingSize === 'number' && recipe.servingSize > 0) {
    nutrition.serving_grams = recipe.servingSize;
  }

  const difficulty = recipe.difficulty;
  const sourceUrl = text(recipe.websiteUrl) ?? pageUrl;

  return {
    title,
    subtitle: text(recipe.headline),
    description: text(recipe.descriptionMarkdown) ?? text(recipe.description),
    sourceUrl,
    hellofreshId: hellofreshIdFrom(sourceUrl, recipe.id, pageUrl),
    prepMinutes: parseDuration(recipe.prepTime),
    totalMinutes: parseDuration(recipe.totalTime),
    difficulty: difficulty === 1 || difficulty === 2 || difficulty === 3 ? difficulty : null,
    servings: chosen?.yields ?? null,
    tags: names(recipe.tags).filter((tag) => !IGNORED_TAGS.has(tag.toLowerCase())),
    allergens: names(
      (recipe.allergens ?? []).filter(
        (item) => !item.tracesOf && !/^peut contenir/i.test(item.name ?? ''),
      ),
    ),
    utensils: names(recipe.utensils),
    ingredients,
    steps,
    nutrition: Object.keys(nutrition).length ? nutrition : null,
    coverImageUrl: imageUrl(recipe.imagePath, COVER_TRANSFORM),
    extractedFrom: 'next-data',
  };
}

// ---------------------------------------------------------------------------
// Source 2 : JSON-LD (repli)
// ---------------------------------------------------------------------------

interface LdRecipe {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  totalTime?: string;
  recipeYield?: string | number;
  recipeIngredient?: string[];
  recipeInstructions?: ({ text?: string } | string)[];
  nutrition?: Record<string, string | null>;
}

function findLdRecipe(html: string): LdRecipe | null {
  const pattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const data: unknown = JSON.parse(match[1] ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = (item as LdRecipe)?.['@type'];
        if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
          return item as LdRecipe;
        }
      }
    } catch {
      // Bloc JSON-LD invalide : on passe au suivant.
    }
  }
  return null;
}

/** « 400 g Grenailles » → { quantity: 400, unit: "g", name: "Grenailles" }. */
export function parseIngredientLine(line: string): ImportedIngredient {
  const fractions: Record<string, number> = {
    '½': 0.5,
    '¼': 0.25,
    '¾': 0.75,
    '⅓': 0.33,
    '⅔': 0.67,
  };
  const match = /^([\d.,]+|[½¼¾⅓⅔])\s+(\S+)\s+(.+)$/.exec(line.trim());
  if (!match) return { name: line.trim(), quantity: null, unit: null, shipped: null };
  const raw = match[1] ?? '';
  const quantity = fractions[raw] ?? Number(raw.replace(',', '.'));
  return {
    name: (match[3] ?? '').trim(),
    quantity: Number.isFinite(quantity) ? quantity : null,
    unit: match[2] ?? null,
    shipped: null,
  };
}

const LD_NUTRIENTS: Record<string, string> = {
  calories: 'kcal',
  fatContent: 'fat',
  saturatedFatContent: 'saturated_fat',
  carbohydrateContent: 'carbs',
  sugarContent: 'sugars',
  fiberContent: 'fiber',
  proteinContent: 'protein',
  // HelloFresh met le sel dans « sodiumContent » (voir docs/architecture.md).
  sodiumContent: 'salt',
};

function fromJsonLd(recipe: LdRecipe, pageUrl: string): ImportedRecipe {
  const title = text(recipe.name);
  if (!title) throw new ImportError('La page ne contient pas de titre de recette.');
  const nutrition: Record<string, number> = {};
  for (const [field, key] of Object.entries(LD_NUTRIENTS)) {
    const value = Number.parseFloat(String(recipe.nutrition?.[field] ?? ''));
    if (Number.isFinite(value)) nutrition[key] = value;
  }
  const image = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
  const servings = Number.parseInt(String(recipe.recipeYield ?? ''), 10);

  return {
    title,
    subtitle: null,
    description: text(recipe.description),
    sourceUrl: pageUrl,
    hellofreshId: hellofreshIdFrom(pageUrl),
    prepMinutes: null,
    totalMinutes: parseDuration(recipe.totalTime),
    difficulty: null,
    servings: Number.isFinite(servings) && servings > 0 ? servings : null,
    tags: [],
    allergens: [],
    utensils: [],
    ingredients: (recipe.recipeIngredient ?? []).map(parseIngredientLine),
    steps: (recipe.recipeInstructions ?? [])
      .map((step) => ({
        text: cleanStepText(typeof step === 'string' ? step : (step.text ?? '')),
        imageUrl: null,
      }))
      .filter((step) => step.text),
    nutrition: Object.keys(nutrition).length ? nutrition : null,
    coverImageUrl: text(image),
    extractedFrom: 'json-ld',
  };
}

// ---------------------------------------------------------------------------

/**
 * Recette contenue dans une page HelloFresh.
 * @param pageUrl adresse finale de la page (après redirections)
 * @throws ImportError si aucune donnée de recette n'est trouvée
 */
export function extractRecipe(html: string, pageUrl: string): ImportedRecipe {
  const next = findNextRecipe(html);
  if (next) return fromNextData(next, pageUrl);
  const ld = findLdRecipe(html);
  if (ld) return fromJsonLd(ld, pageUrl);
  throw new ImportError(
    'Aucune recette trouvée sur cette page. HelloFresh a peut-être changé son site : utilisez la saisie manuelle.',
  );
}

/**
 * Vérifie qu'une adresse est une page de recette hellofresh.fr et la normalise
 * (https, www, sans paramètres ni ancre).
 * @throws ImportError sinon
 */
export function normalizeRecipeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ImportError('Ce n’est pas une adresse web valide.', 400);
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'www.hellofresh.fr' && host !== 'hellofresh.fr') {
    throw new ImportError('Seuls les liens hellofresh.fr sont acceptés.', 400);
  }
  if (!url.pathname.startsWith('/recipes/') || url.pathname.length <= '/recipes/'.length) {
    throw new ImportError(
      'Ce lien n’est pas une page de recette (il doit contenir « /recipes/ »).',
      400,
    );
  }
  return `https://www.hellofresh.fr${url.pathname.replace(/\/$/, '')}`;
}
