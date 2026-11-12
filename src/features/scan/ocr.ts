/**
 * Lecture des photos de feuillet sur l'appareil, avec Tesseract.js.
 *
 * - Gratuit et privé : le moteur et le modèle français sont servis par l'app
 *   (public/ocr/, voir scripts/copy-ocr-assets.mjs) ; aucune image ne quitte le téléphone.
 * - Chargé à la demande (`import()`) : rien n'est téléchargé tant qu'on ne scanne pas.
 * - Les images sont préparées avant lecture (taille, niveaux de gris, contraste), ce qui
 *   améliore nettement la reconnaissance des photos prises au téléphone.
 */
import { fitWithin, loadImage } from '../../data/images';

/** Taille de travail : assez pour lire les petits caractères, sans ralentir l'iPhone. */
const OCR_MAX_SIZE = 2400;
/** En dessous de cette confiance (0-100), un mot est signalé « à vérifier ». */
const LOW_CONFIDENCE = 60;
/** Démarrage du moteur (téléchargement compris au premier scan) : au-delà, on abandonne. */
const START_TIMEOUT_MS = 60_000;

/** Erreur de démarrage du moteur (fichier introuvable, réseau coupé au premier scan…). */
export class OcrStartError extends Error {}

/** Attend une promesse, sans dépasser un délai et en restant annulable. */
function settleWithin<T>(promise: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new OcrStartError('Le moteur de lecture n’a pas pu démarrer.')),
      ms,
    );
    const onAbort = () => reject(new DOMException('Lecture annulée', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    });
  });
}

export interface OcrResult {
  /** Texte de chaque photo, dans l'ordre. */
  pages: string[];
  /** Mots lus avec une faible confiance. */
  lowConfidence: Set<string>;
}

export interface OcrProgress {
  /** 0 à 1, toutes photos confondues. */
  value: number;
  stage: 'loading' | 'reading';
}

/**
 * Prépare une photo pour l'OCR : réduite à 2400 px, en niveaux de gris, contraste étiré
 * (les 2 % les plus sombres deviennent noirs, les 2 % les plus clairs blancs).
 */
export async function preprocess(file: Blob): Promise<HTMLCanvasElement> {
  const image = await loadImage(file);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, OCR_MAX_SIZE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Le navigateur ne peut pas traiter l’image.');
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  const histogram = new Uint32Array(256);
  // Les tableaux typés renvoient `undefined` hors limites : `?? 0` n'arrive jamais ici.
  const at = (array: ArrayLike<number>, index: number) => array[index] ?? 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      0.299 * at(data, i) + 0.587 * at(data, i + 1) + 0.114 * at(data, i + 2),
    );
    data[i] = gray;
    histogram[gray] = at(histogram, gray) + 1;
  }

  // Seuils sombre / clair à 2 % des pixels, puis étirement linéaire entre les deux.
  const total = width * height;
  let low = 0;
  for (let sum = at(histogram, 0); low < 254 && sum < total * 0.02; sum += at(histogram, ++low));
  let high = 255;
  for (
    let sum = at(histogram, 255);
    high > low + 1 && sum < total * 0.02;
    sum += at(histogram, --high)
  );
  const range = Math.max(1, high - low);
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.min(255, Math.max(0, ((at(data, i) - low) * 255) / range));
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

interface TesseractWord {
  text?: string;
  confidence?: number;
}

/** Parcourt la structure blocs → paragraphes → lignes → mots renvoyée par Tesseract. */
function wordsOf(blocks: unknown): TesseractWord[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block: { paragraphs?: { lines?: { words?: TesseractWord[] }[] }[] }) =>
    (block.paragraphs ?? []).flatMap((paragraph) =>
      (paragraph.lines ?? []).flatMap((line) => line.words ?? []),
    ),
  );
}

/**
 * Lit les photos l'une après l'autre.
 * @param signal permet d'annuler : le worker est alors arrêté immédiatement
 * @throws DOMException « AbortError » en cas d'annulation
 */
export async function recognize(
  files: Blob[],
  onProgress: (progress: OcrProgress) => void,
  signal: AbortSignal,
): Promise<OcrResult> {
  onProgress({ value: 0, stage: 'loading' });
  const { createWorker } = await import('tesseract.js');
  const base = `${import.meta.env.BASE_URL}ocr`;
  let current = 0;

  const starting = createWorker('fra', 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/core`,
    langPath: base,
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress({ value: (current + message.progress) / files.length, stage: 'reading' });
      }
    },
  });
  // Si un fichier du moteur ne se charge pas, Tesseract n'échoue pas toujours : on borne
  // le démarrage, et l'annulation doit aussi fonctionner pendant cette phase.
  const worker = await settleWithin(starting, START_TIMEOUT_MS, signal).catch((error: unknown) => {
    void starting.then((late) => late.terminate()).catch(() => undefined);
    throw error;
  });
  const abort = () => void worker.terminate();
  signal.addEventListener('abort', abort, { once: true });

  try {
    const pages: string[] = [];
    const lowConfidence = new Set<string>();
    for (const [index, file] of files.entries()) {
      current = index;
      signal.throwIfAborted();
      const canvas = await preprocess(file);
      signal.throwIfAborted();
      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
      pages.push(data.text ?? '');
      for (const word of wordsOf(data.blocks)) {
        if (word.text && (word.confidence ?? 100) < LOW_CONFIDENCE) lowConfidence.add(word.text);
      }
    }
    onProgress({ value: 1, stage: 'reading' });
    return { pages, lowConfidence };
  } finally {
    signal.removeEventListener('abort', abort);
    if (!signal.aborted) await worker.terminate();
  }
}
