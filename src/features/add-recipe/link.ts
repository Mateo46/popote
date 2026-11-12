/**
 * Lecture du lien collé par l'utilisateur.
 *
 * Le partage iOS depuis l'app HelloFresh ou Safari colle souvent une phrase entière
 * (« Découvrez cette recette : https://… ») : on en extrait la première adresse web.
 */
export function extractUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"']+/i.exec(text);
  if (match) return match[0].replace(/[.,;:!?)]+$/, '');
  const bare = text.trim();
  // Lien sans protocole (« www.hellofresh.fr/recipes/… »).
  return /^(www\.)?hellofresh\.fr\//i.test(bare) ? `https://${bare}` : null;
}

/** Identifiant HelloFresh (24 caractères hexadécimaux) en fin d'adresse, s'il y en a un. */
export function hellofreshIdInUrl(url: string): string | null {
  return /([0-9a-f]{24})\/?(?:[?#].*)?$/.exec(url)?.[1] ?? null;
}
