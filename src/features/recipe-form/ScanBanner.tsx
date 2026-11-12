/**
 * Bandeau de relecture d'un scan : propose de retrouver la recette sur HelloFresh, ce qui
 * donne un résultat bien plus fiable que l'OCR.
 *
 * La recherche HelloFresh n'est pas interrogeable par l'app (voir docs/architecture.md,
 * phase 1) : on ouvre la page de recherche du site avec le titre reconnu, l'utilisateur
 * copie le lien de la bonne recette et le colle ici. Les photos du feuillet sont gardées.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useImportHellofresh } from '../../data/hooks';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { extractUrl } from '../add-recipe/link';
import styles from './ScanBanner.module.css';

interface ScanBannerProps {
  title: string | null;
  scanFiles: File[];
}

export function ScanBanner({ title, scanFiles }: ScanBannerProps) {
  const navigate = useNavigate();
  const importRecipe = useImportHellofresh();
  const [pasting, setPasting] = useState(false);
  const [link, setLink] = useState('');
  const searchUrl = `https://www.hellofresh.fr/recipes/search?q=${encodeURIComponent(title ?? '')}`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const url = extractUrl(link);
    if (!url) return;
    importRecipe.mutate(url, {
      onSuccess: (imported) =>
        navigate('/recettes/nouvelle', { replace: true, state: { imported, scanFiles } }),
    });
  }

  return (
    <div className={styles.banner}>
      <p>
        {title ? strings.review.recognized(title) : strings.review.unrecognized}{' '}
        {strings.review.suggestLink}
      </p>
      <div className={styles.actions}>
        <a className={styles.action} href={searchUrl} target="_blank" rel="noreferrer">
          <Icon name="external" size={16} />
          {strings.review.searchHellofresh}
        </a>
        <button type="button" className={styles.action} onClick={() => setPasting(true)}>
          <Icon name="paste" size={16} />
          {strings.review.pasteLink}
        </button>
      </div>
      {pasting && (
        <form className={styles.link} onSubmit={handleSubmit} noValidate>
          <input
            id="scan-link"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            autoFocus
            aria-label={strings.review.linkLabel}
            placeholder="hellofresh.fr/recipes/…"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
          <Button type="submit" disabled={!link.trim() || importRecipe.isPending}>
            {importRecipe.isPending ? strings.review.importing : strings.review.importLink}
          </Button>
        </form>
      )}
      {importRecipe.isError && (
        <p className={styles.error} role="alert">
          {importRecipe.error.message}
        </p>
      )}
    </div>
  );
}
