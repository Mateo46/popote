/**
 * Bandeau discret affiché hors connexion : les recettes déjà chargées restent lisibles,
 * mais les modifications attendront le retour du réseau.
 */
import { strings } from '../strings';
import styles from './OfflineBanner.module.css';
import { useOnline } from './useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p className={`${styles.banner} glass`} role="status">
      {strings.offline.banner}
    </p>
  );
}
