/**
 * Gabarit d'un écran d'onglet : grand titre iOS, actions optionnelles à droite,
 * fondu sous la barre d'état (iOS 27) et marge basse pour la barre d'onglets flottante.
 */
import type { ReactNode } from 'react';
import styles from './Screen.module.css';

interface ScreenProps {
  title: string;
  subtitle?: string | undefined;
  /** Boutons affichés à droite du titre (par ex. « + »). */
  actions?: ReactNode | undefined;
  children: ReactNode;
}

export function Screen({ title, subtitle, actions, children }: ScreenProps) {
  return (
    <main className={styles.screen}>
      <div className={styles.edge} aria-hidden="true" />
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </main>
  );
}
