/**
 * Liste groupée iOS : un intitulé de section, puis des lignes séparées par des filets fins.
 */
import type { ReactNode } from 'react';
import styles from './Group.module.css';

interface GroupProps {
  label?: string;
  /** Note affichée sous le groupe. */
  footer?: ReactNode;
  children: ReactNode;
}

export function Group({ label, footer, children }: GroupProps) {
  return (
    <section className={styles.section}>
      {label && <h2 className={styles.label}>{label}</h2>}
      <div className={styles.group}>{children}</div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
  );
}

interface RowProps {
  children: ReactNode;
  /** Valeur affichée à droite, en texte secondaire. */
  value?: ReactNode;
}

export function Row({ children, value }: RowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.main}>{children}</span>
      {value !== undefined && <span className={styles.value}>{value}</span>}
    </div>
  );
}
