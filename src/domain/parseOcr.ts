/**
 * Lecture du texte reconnu (OCR) sur un feuillet HelloFresh : titre, durée, ingrédients,
 * étapes, nutrition, allergènes.
 *
 * L'OCR gratuit fait des erreurs, surtout sur les mises en page en colonnes : ce module
 * cherche à donner un brouillon utile, pas parfait. Tout ce qui est incertain est signalé
 * (`suspicious`) et le texte brut reste consultable dans l'écran de relecture.
 *
 * Fonctions pures, testées sur des textes OCR. Les règles ont été écrites d'après la
 * structure habituelle des fiches (recto : titre, ingrédients en colonnes par nombre de
 * personnes, « à ajouter vous-même », nutrition ; verso : étapes numérotées) et sont à
 * ajuster sur de vrais feuillets (voir docs/architecture.md).
 */
import { normalizeName } from './normalize';
import type { NutrientKey } from './recipe';

export interface ScannedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** `false` : listé dans « à ajouter vous-même ». */
  shipped: boolean | null;
  /** Ligne probablement mal lue : à vérifier (chiffre au milieu d'un mot, mot peu sûr…). */
  suspicious: boolean;
}

export interface ParsedScan {
  title: string | null;
  subtitle: string | null;
  minutes: number | null;
  ingredients: ScannedIngredient[];
  steps: string[];
  nutrition: Partial<Record<NutrientKey | 'serving_grams', number>>;
  allergens: string[];
}

type Section =
  'header' | 'ingredients' | 'pantry' | 'utensils' | 'nutrition' | 'allergens' | 'steps';

/** Intitulés de section reconnus (texte normalisé, sans accents). */
const SECTION_PATTERNS: [Section, RegExp][] = [
  ['pantry', /^(a ajouter vous meme|a avoir chez (soi|vous)|a prevoir|vous aurez (aussi )?besoin)/],
  ['ingredients', /^(vos )?ingredients/],
  ['utensils', /^ustensiles/],
  ['nutrition', /^(valeurs nutritionnelles|informations nutritionnelles|nutrition)/],
  ['allergens', /^allergenes?/],
  ['steps', /^(instructions|preparation|etapes|a vos fourneaux)/],
];

const UNITS = [
  'g',
  'kg',
  'mg',
  'ml',
  'cl',
  'l',
  'cs',
  'cc',
  'c\\. ?a s\\.',
  'c\\. ?a c\\.',
  'cm',
  'pieces?',
  'pieces?\\(s\\)',
  'piece\\(s\\)',
  'sachets?',
  'sachet\\(s\\)',
  'paquets?',
  'paquet\\(s\\)',
  'pots?',
  'pot\\(s\\)',
  'bottes?',
  'botte\\(s\\)',
  'boites?',
  'boite\\(s\\)',
  'tranches?',
  'tranche\\(s\\)',
  'gousses?',
];

/** Nombre : 400, 1,5, ½, 1½, 1/2. */
const NUMBER = String.raw`(?:\d+(?:[.,]\d+)?\s?[½¼¾⅓⅔]?|[½¼¾⅓⅔]|\d+\s?/\s?\d+)`;
const UNIT = `(?:${UNITS.join('|')})`;

const NUTRIENT_LABELS: [NutrientKey, RegExp][] = [
  ['kcal', /^energie.*kcal|^kcal|^calories/],
  ['saturated_fat', /^dont (acides gras )?satur/],
  ['fat', /^matieres? grasses|^lipides/],
  ['sugars', /^dont sucres/],
  ['carbs', /^glucides/],
  ['fiber', /^fibres/],
  ['protein', /^proteines/],
  ['salt', /^sel\b/],
];

const fractions: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 };

/** « 1,5 » → 1.5 ; « ½ » → 0.5 ; « 1½ » → 1.5 ; « 1/2 » → 0.5. */
export function parseNumber(text: string): number | null {
  const value = text.replace(/\s/g, '').replace(',', '.');
  const fraction = /^(\d*)([½¼¾⅓⅔])$/.exec(value);
  if (fraction) return Number(fraction[1] || 0) + (fractions[fraction[2] ?? ''] ?? 0);
  const slash = /^(\d+)\/(\d+)$/.exec(value);
  if (slash) return Number(slash[2]) ? Number(slash[1]) / Number(slash[2]) : null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Corrige les confusions OCR courantes dans les nombres : « 1OO » → « 100 »,
 * « l5 » → « 15 », « 1% » → « 1½ ».
 */
function fixDigits(text: string): string {
  // Répété jusqu'à stabilité : « 1OO » devient « 10O » au premier passage, puis « 100 ».
  let previous = '';
  let current = text;
  while (current !== previous) {
    previous = current;
    current = current
      .replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, '0')
      .replace(/(?<=\d)[lI]|[lI](?=\d)/g, '1')
      // « ½ » est souvent lu « % » ou « Y2 » : « 1% cs » → « 1½ cs ».
      .replace(/(?<=\d)\s?(%|Y2|y2)(?=\s|[a-z]|$)/g, '½');
  }
  return current;
}

/** Ligne probablement mal lue : chiffres collés à des lettres, caractères parasites. */
function looksSuspicious(raw: string, lowConfidence: ReadonlySet<string>): boolean {
  const words = raw.split(/\s+/);
  if (words.some((word) => lowConfidence.has(word))) return true;
  if (/[a-zà-ÿ]\d[a-zà-ÿ]/i.test(raw)) return true; // « po1sson »
  if (/\d[Oo]|[Oo]\d/.test(raw)) return true; // « 1OO »
  return /[|{}[\]<>@#$%^*_=~]/.test(raw);
}

function sectionOf(line: string): Section | null {
  const key = normalizeName(line);
  for (const [section, pattern] of SECTION_PATTERNS) if (pattern.test(key)) return section;
  return null;
}

/** En-tête de colonnes par nombre de personnes : « 2P 3P 4P », « 2 pers. 4 pers. ». */
function servingColumns(line: string): number[] | null {
  const matches = [...line.matchAll(/(\d)\s?(?:p\b|pers)/gi)].map((m) => Number(m[1]));
  return matches.length >= 2 ? matches : null;
}

/**
 * Une ligne d'ingrédient. Formes reconnues :
 *  - « 400 g Grenailles », « ½ sachet Citronnelle » (quantité devant) ;
 *  - « Grenailles 200 g 400 g 600 g », « Grenailles (g) 200 400 600 » (colonnes).
 * Avec des colonnes, on prend celle de 2 personnes si l'en-tête a été lu, sinon la première.
 */
export function parseIngredientLine(
  raw: string,
  columns: number[] | null,
  shipped: boolean | null,
  lowConfidence: ReadonlySet<string> = new Set(),
): ScannedIngredient | null {
  const line = raw.replace(/^[-•·*]\s*/, '').trim();
  if (!/[a-zà-ÿ]{2}/i.test(line)) return null;
  const suspicious = looksSuspicious(line, lowConfidence);
  const cleaned = fixDigits(line);
  // Sans accents pour les motifs (« pièce(s) » → « piece(s) ») ; même longueur que `cleaned`
  // pour les lettres accentuées courantes, ce qui permet de reprendre le texte d'origine.
  const ascii = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Quantité devant le nom.
  const leading = new RegExp(`^(${NUMBER})\\s*(${UNIT})?\\.?\\s+(.+)$`, 'i').exec(ascii);
  if (leading) {
    const offset = cleaned.length - (leading[3]?.length ?? 0);
    return {
      name: cleaned.slice(offset).trim(),
      quantity: parseNumber(leading[1] ?? ''),
      unit: leading[2]
        ? (cleaned
            .slice((leading[1] ?? '').length)
            .trim()
            .split(/\s+/)[0] ?? null)
        : null,
      shipped,
      suspicious,
    };
  }

  // Quantités en colonnes après le nom.
  const trailing = new RegExp(
    `^(.+?)\\s*(?:\\((${UNIT})\\))?\\s+((?:${NUMBER}\\s*(?:${UNIT})?\\.?\\s*)+)$`,
    'i',
  ).exec(ascii);
  if (trailing) {
    const nameLength = trailing[1]?.length ?? 0;
    const values = [...(trailing[3] ?? '').matchAll(new RegExp(`(${NUMBER})\\s*(${UNIT})?`, 'gi'))];
    const index = columns ? Math.max(0, columns.indexOf(2)) : 0;
    const chosen = values[Math.min(index, values.length - 1)];
    const unit = trailing[2] ?? chosen?.[2] ?? null;
    return {
      name: cleaned
        .slice(0, nameLength)
        .replace(/\s*\($/, '')
        .trim(),
      quantity: chosen ? parseNumber(chosen[1] ?? '') : null,
      unit,
      shipped,
      suspicious,
    };
  }

  return { name: cleaned, quantity: null, unit: null, shipped, suspicious };
}

function parseNutrition(lines: string[]): ParsedScan['nutrition'] {
  const nutrition: ParsedScan['nutrition'] = {};
  // Deux colonnes possibles (« pour 100 g » et « par portion ») : on lit l'en-tête pour
  // savoir laquelle est la portion ; à défaut, on prend la dernière valeur de la ligne.
  let portionColumn: 'first' | 'last' = 'last';
  for (const line of lines) {
    const key = normalizeName(line);
    if (key.includes('portion') && key.includes('100')) {
      portionColumn = key.indexOf('portion') < key.indexOf('100') ? 'first' : 'last';
      continue;
    }
    const portion = /portion\s*:?\s*(\d+)\s*g/.exec(key);
    if (portion?.[1]) nutrition.serving_grams = Number(portion[1]);
    const match = NUTRIENT_LABELS.find(([, pattern]) => pattern.test(key));
    if (!match) continue;
    // Les chiffres de l'intitulé (« (kJ) », « (kcal) ») ne sont pas des valeurs.
    const values = [...fixDigits(line).matchAll(/(\d+(?:[.,]\d+)?)\s*(?:k?cal|kj|g)?/gi)]
      .map((m) => parseNumber(m[1] ?? ''))
      .filter((value): value is number => value !== null);
    if (!values.length) continue;
    const value = portionColumn === 'first' ? values[0] : values[values.length - 1];
    if (value !== undefined && nutrition[match[0]] === undefined) nutrition[match[0]] = value;
  }
  return nutrition;
}

/** Numéro d'étape seul ou en début de ligne : « 1 », « 2. », « 3) Faites… ». */
const STEP_START = /^(\d{1,2})\s*[.)\-–:]?\s*(.*)$/;

function parseSteps(lines: string[]): string[] {
  const steps: string[] = [];
  let expected = 1;
  for (const line of lines) {
    const match = STEP_START.exec(line);
    const number = match ? Number(match[1]) : NaN;
    // Un nombre n'ouvre une étape que s'il est le suivant attendu (évite « 200 g » ou
    // « 15 min » en début de ligne).
    if (match && number === expected && !/^\d+\s*(min|g|ml|cl|°)/i.test(line)) {
      steps.push(match[2]?.trim() ?? '');
      expected += 1;
    } else if (steps.length) {
      steps[steps.length - 1] = `${steps[steps.length - 1]} ${line}`.trim();
    }
  }
  return steps.map((step) => step.replace(/\s+/g, ' ').trim()).filter((step) => step.length > 3);
}

/**
 * Analyse le texte OCR d'un feuillet (une entrée par photo : recto, verso).
 * @param lowConfidence mots que l'OCR a lus avec une faible confiance
 */
export function parseOcr(
  pages: string[],
  lowConfidence: ReadonlySet<string> = new Set(),
): ParsedScan {
  const pageLines = pages.map((page) =>
    page
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => /[\p{L}\d]/u.test(line)),
  );
  const lines = pageLines.flat();

  const bySection: Record<Section, string[]> = {
    header: [],
    ingredients: [],
    pantry: [],
    utensils: [],
    nutrition: [],
    allergens: [],
    steps: [],
  };
  let current: Section = 'header';
  for (const [index, line] of pageLines.flatMap((page) => page.map((l, i) => [i, l] as const))) {
    // Chaque photo (recto, verso) repart de zéro : le verso ne prolonge pas les ingrédients.
    if (index === 0) current = 'header';
    const section = sectionOf(line);
    if (section) {
      current = section;
      // « Allergènes : gluten, céleri » : la liste peut suivre l'intitulé sur la même ligne.
      const rest = line.split(':').slice(1).join(':').trim();
      if (rest) bySection[current].push(rest);
      // « Ingrédients 2P 3P 4P » : l'en-tête des colonnes est souvent sur la même ligne.
      else if (servingColumns(line)) bySection[current].push(line);
      continue;
    }
    // Un « 1 » seul ou en tête de ligne ouvre les étapes (verso) — sauf dans les
    // ingrédients, où « 1 sachet Sauce soja » est une quantité.
    const inIngredients = current === 'ingredients' || current === 'pantry';
    if (current !== 'steps' && !inIngredients && /^1\s*[.)]?(\s+\p{L}|$)/u.test(line)) {
      current = 'steps';
    }
    bySection[current].push(line);
  }

  // Titre : première ligne « parlante » de l'en-tête ; sous-titre : ligne en « avec … ».
  const header = bySection.header.filter(
    (line) => !/hellofresh|^\d+\s*min|^\d+\s*(p|pers)/i.test(line) && line.length >= 6,
  );
  let title = header.find((line) => /\p{L}{3}/u.test(line) && !/^avec\b/i.test(line)) ?? null;
  let subtitle = header.find((line) => /^(avec|&)\b/i.test(line)) ?? null;
  if (title && !subtitle) {
    const split = /^(.+?)\s+(avec\s.+)$/i.exec(title);
    if (split) [title, subtitle] = [split[1] ?? title, split[2] ?? null];
  }

  const minutes = /(\d{1,3})\s*min/i.exec([...bySection.header, ...lines].join(' '));

  let columns: number[] | null = null;
  const ingredients: ScannedIngredient[] = [];
  for (const [section, shipped] of [
    ['ingredients', true],
    ['pantry', false],
  ] as const) {
    for (const line of bySection[section]) {
      const header = servingColumns(line);
      if (header) {
        columns = header;
        continue;
      }
      const ingredient = parseIngredientLine(line, columns, shipped, lowConfidence);
      if (ingredient) ingredients.push(ingredient);
    }
  }

  return {
    title: title?.trim() ?? null,
    subtitle: subtitle?.trim() ?? null,
    minutes: minutes ? Number(minutes[1]) : null,
    ingredients,
    steps: parseSteps(bySection.steps),
    nutrition: parseNutrition(bySection.nutrition),
    allergens: bySection.allergens
      .join(',')
      .split(/[,•·;]/)
      .map((item) => item.replace(/\.$/, '').trim())
      .filter((item) => item.length > 1),
  };
}
