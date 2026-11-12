/**
 * Écran de connexion par e-mail et mot de passe.
 *
 * Pas de lien magique : sur iOS, il s'ouvrirait dans Safari et non dans l'app installée,
 * dont le stockage est séparé. Les attributs `autoComplete` permettent au trousseau iCloud
 * de proposer et d'enregistrer les identifiants.
 */
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { signIn, useAuth } from '../../data/auth';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Une fois connecté, on retourne à la page demandée avant la redirection.
  if (auth.status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(await signIn(email, password));
    setSubmitting(false);
  }

  return (
    <main className={styles.page}>
      <img className={styles.icon} src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 className={styles.title}>{strings.appName}</h1>
      <p className={styles.intro}>{strings.auth.intro}</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.label}>{strings.auth.email}</span>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{strings.auth.password}</span>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={submitting || !email || !password}>
          {submitting ? strings.auth.submitting : strings.auth.submit}
        </Button>
        <p className={styles.note}>{strings.auth.noAccount}</p>
      </form>
    </main>
  );
}
