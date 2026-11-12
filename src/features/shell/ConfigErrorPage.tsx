/** Affiché à la place de l'app quand les variables Supabase manquent ou sont invalides. */
import { strings } from '../../strings';
import styles from './ConfigErrorPage.module.css';

export function ConfigErrorPage({ errors }: { errors: string[] }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{strings.config.title}</h1>
      <p className={styles.body}>{strings.config.body}</p>
      <ul className={styles.list}>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </main>
  );
}
