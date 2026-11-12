/**
 * Valeur obtenue en touchant l'étoile `index` (0 à 4) à la position relative `x` (0 à 1) :
 * moitié gauche = demi-étoile. Toucher la note actuelle l'efface (`null`).
 */
export function ratingFromPointer(index: number, x: number, current: number | null) {
  const value = index + (x < 0.5 ? 0.5 : 1);
  return value === current ? null : value;
}
