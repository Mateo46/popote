/**
 * Gabarit d'un écran d'onglet : grand titre iOS, actions optionnelles à droite,
 * fondu sous la barre d'état (iOS 27) et marge basse pour la barre d'onglets flottante.
 */
import type { ReactNode } from 'react';
import { GlassButton } from './GlassButton';
import styles from './Screen.module.css';

interface ScreenProps {
  title: string;
  subtitle?: string | undefined;
  /** Boutons affichés à droite du titre (par ex. « + »). */
  actions?: ReactNode | undefined;
  /** Sous-écran : bouton retour au-dessus du titre, avec ce libellé VoiceOver. */
  back?: { label: string; onClick: () => void } | undefined;
  children: ReactNode;
}

export function Screen({ title, subtitle, actions, back, children }: ScreenProps) {
  return (
    <main className={styles.screen}>
      <div className={styles.edge} aria-hidden="true" />
      {back && (
        <div className={styles.back}>
          <GlassButton icon="back" label={back.label} onClick={back.onClick} />
        </div>
      )}
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
