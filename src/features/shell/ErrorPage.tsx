/**
 * Écran d'erreur imprévue (bogue, ou fichier d'un écran introuvable après une mise à
 * jour de l'app). Propose de recharger, ce qui récupère la dernière version.
 */
import { useRouteError } from 'react-router';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import styles from './ConfigErrorPage.module.css';

export function ErrorPage() {
  const error = useRouteError();
  // Après un déploiement, l'ancien découpage du code n'existe plus : un rechargement suffit.
  const outdated =
    error instanceof Error &&
    /dynamically imported module|Importing a module script/i.test(error.message);
  console.error(error);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>
        {outdated ? strings.error.outdatedTitle : strings.error.title}
      </h1>
      <p className={styles.body}>{outdated ? strings.error.outdatedBody : strings.error.body}</p>
      <div>
        <Button onClick={() => window.location.reload()}>{strings.error.reload}</Button>
      </div>
    </main>
  );
}
