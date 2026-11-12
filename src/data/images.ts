/**
 * Redimensionnement des photos dans le navigateur avant envoi.
 *
 * Une photo d'iPhone pèse 3 à 5 Mo : on l'envoie en JPEG de 1600 px maximum (≈ 300 Ko),
 * plus une vignette de 400 px pour les listes. Le JPEG est choisi plutôt que le WebP
 * parce que tous les Safari iOS savent l'encoder via `canvas.toBlob`.
 */

export const PHOTO_MAX_SIZE = 1600;
export const THUMB_MAX_SIZE = 400;
const JPEG_QUALITY = 0.82;

/** Chemin de la vignette associée à une photo (« a/b.jpg » → « a/b.thumb.jpg »). */
export function thumbPath(path: string): string {
  return path.replace(/\.jpg$/, '.thumb.jpg');
}

/** Dimensions réduites en gardant les proportions ; jamais d'agrandissement. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible. Essayez une photo au format JPEG ou PNG.'));
    };
    // Le navigateur applique l'orientation EXIF : une photo prise en portrait reste droite.
    image.src = url;
  });
}

function encode(image: HTMLImageElement, max: number): Promise<Blob> {
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Le navigateur ne peut pas traiter l’image.'));
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Échec de la compression.'))),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

/** Produit la photo (1600 px) et sa vignette (400 px) à partir d'un fichier ou d'un blob. */
export async function prepareImage(file: Blob): Promise<{ photo: Blob; thumb: Blob }> {
  const image = await loadImage(file);
  const [photo, thumb] = await Promise.all([
    encode(image, PHOTO_MAX_SIZE),
    encode(image, THUMB_MAX_SIZE),
  ]);
  return { photo, thumb };
}
