/**
 * Copie les fichiers de Tesseract.js (lecture des feuillets) dans public/ocr/, pour que
 * l'app les serve elle-même : aucun CDN tiers, et aucune image envoyée hors de l'appareil.
 *
 * Lancé automatiquement avant `npm run dev` et `npm run build` (scripts predev/prebuild).
 * public/ocr/ n'est pas versionné : il se régénère depuis node_modules.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'ocr');
mkdirSync(join(target, 'core'), { recursive: true });

const copy = (from, to) => copyFileSync(join(root, 'node_modules', from), join(target, to));

// Script du Web Worker qui pilote Tesseract.
copy('tesseract.js/dist/worker.min.js', 'worker.min.js');

// Moteur WebAssembly : uniquement les variantes LSTM (moteur neuronal, OEM 1) ; Tesseract
// choisit au lancement celle que l'appareil sait exécuter (SIMD ou non).
const coreDir = join(root, 'node_modules', 'tesseract.js-core');
for (const file of readdirSync(coreDir)) {
  if (/^tesseract-core(-simd|-relaxedsimd)?-lstm\.wasm\.js$/.test(file)) {
    copy(`tesseract.js-core/${file}`, `core/${file}`);
  }
}

// Modèle français compact (« best_int ») : 0,7 Mo, bonne précision avec le moteur LSTM.
copy('@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz', 'fra.traineddata.gz');

console.log('Fichiers OCR copiés dans public/ocr/');
