/**
 * Mise en forme des nombres, quantités et dates, à la française.
 * Fonctions pures : la date du jour est passée en paramètre pour rester testable.
 */

const fractions: [number, string][] = [
  [0.25, '¼'],
  [0.33, '⅓'],
  [0.5, '½'],
  [0.66, '⅔'],
  [0.75, '¾'],
];

/** 0,5 → « ½ », 1,5 → « 1½ », 0,66 → « ⅔ », 2,4 → « 2,4 ». */
export function formatNumber(value: number): string {
  const whole = Math.floor(value);
  const rest = value - whole;
  // HelloFresh stocke ⅓ et ⅔ comme 0,33000001… : tolérance de 0,02.
  const fraction = fractions.find(([amount]) => Math.abs(rest - amount) < 0.02);
  if (fraction) return whole === 0 ? fraction[1] : `${whole}${fraction[1]}`;
  return String(Math.round(value * 10) / 10).replace('.', ',');
}

/** Abréviations et pluriels des unités HelloFresh. */
const unitLabels: Record<string, { one: string; many: string } | null> = {
  'pièce(s)': null, // « 2 tomates » : l'unité n'apporte rien.
  pièce: null,
  cc: { one: 'c. à c.', many: 'c. à c.' },
  cs: { one: 'c. à s.', many: 'c. à s.' },
  'sachet(s)': { one: 'sachet', many: 'sachets' },
  'paquet(s)': { one: 'paquet', many: 'paquets' },
  'pot(s)': { one: 'pot', many: 'pots' },
  'botte(s)': { one: 'botte', many: 'bottes' },
  'boîte(s)': { one: 'boîte', many: 'boîtes' },
  'tranche(s)': { one: 'tranche', many: 'tranches' },
};

/**
 * Quantité affichée à droite d'un ingrédient : « 240 g », « ½ sachet », « 2 c. à s. ».
 * Quantité nulle ou absente → « selon le goût » ou chaîne vide.
 */
export function formatQuantity(quantity: number | null, unit: string | null): string {
  const cleanUnit = unit?.trim() ?? '';
  if (quantity === null || quantity === 0) {
    return cleanUnit.toLowerCase() === 'selon le goût' ? 'selon le goût' : '';
  }
  const amount = formatNumber(quantity);
  if (!cleanUnit) return amount;
  const known = unitLabels[cleanUnit];
  if (known === null) return amount;
  if (known) return `${amount} ${quantity > 1 ? known.many : known.one}`;
  return `${amount} ${cleanUnit}`;
}

/** 4,5 → « 4,5 » ; 4 → « 4 ». */
export function formatRating(rating: number): string {
  return String(rating).replace('.', ',');
}

/** 35 → « 35 min » ; 90 → « 1 h 30 ». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

/** Date locale au format AAAA-MM-JJ (pas UTC : « aujourd'hui » doit être le jour local). */
export function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (positif si `iso` est passé). */
export function daysSince(iso: string, today: Date): number {
  const ms = parseIsoDate(toLocalIsoDate(today)).getTime() - parseIsoDate(iso).getTime();
  return Math.round(ms / 86_400_000);
}

/** « Aujourd'hui », « Hier », « Il y a 12 j », « Il y a 3 sem. », « Il y a 4 mois », « Il y a 2 ans ». */
export function formatDaysAgo(iso: string, today: Date): string {
  const days = daysSince(iso, today);
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  if (days < 21) return `Il y a ${days} j`;
  if (days < 60) return `Il y a ${Math.round(days / 7)} sem.`;
  if (days < 365) return `Il y a ${Math.round(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
}

const longDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** « Samedi 18 octobre 2026 ». */
export function formatLongDate(iso: string): string {
  const text = longDate.format(parseIsoDate(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « 18 oct. ». */
export function formatShortDate(iso: string): string {
  return shortDate.format(parseIsoDate(iso));
}
