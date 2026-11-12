/** Adresse inconnue (lien périmé, faute de frappe). */
import { Link } from 'react-router';
import { strings } from '../../strings';
import { Screen } from '../../ui/Screen';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <Screen title={strings.notFound.title}>
      <Link to="/" className={styles.link}>
        {strings.notFound.back}
      </Link>
    </Screen>
  );
}
