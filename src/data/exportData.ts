/**
 * Export de toutes les données du foyer en un fichier JSON lisible : sauvegarde
 * personnelle, ou point de départ d'une migration vers un autre outil.
 *
 * Les photos ne sont pas incluses (elles restent dans le stockage Supabase) : le fichier
 * donne seulement leurs chemins.
 */
import { listEntries } from './pantry';
import { listRecipes } from './recipes';

export interface ExportFile {
  format: 'popote-export';
  version: 1;
  exportedAt: string;
  appVersion: string;
  recipes: Awaited<ReturnType<typeof listRecipes>>;
  pantry: Awaited<ReturnType<typeof listEntries>>;
  staples: Awaited<ReturnType<typeof listEntries>>;
}

/** Rassemble les recettes (historique et chemins des photos compris), le frigo et les basiques. */
export async function buildExport(): Promise<ExportFile> {
  const [recipes, pantry, staples] = await Promise.all([
    listRecipes(),
    listEntries('pantry_items'),
    listEntries('pantry_staples'),
  ]);
  return {
    format: 'popote-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    recipes,
    pantry,
    staples,
  };
}

/** Nom du fichier : « popote-2026-11-13.json ». */
export function exportFileName(date: Date): string {
  return `popote-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Propose le fichier à l'utilisateur : menu de partage sur iPhone (Enregistrer dans
 * Fichiers, AirDrop…), sinon téléchargement classique.
 * @returns `false` si l'utilisateur a fermé le menu de partage
 */
export async function shareExport(data: ExportFile): Promise<boolean> {
  const name = exportFileName(new Date());
  const file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      // Partage refusé par le navigateur : on bascule sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
