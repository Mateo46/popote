/** Message affiché quand un écran n'a encore rien à montrer. */
import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title?: string;
  children: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {title && <h2 className={styles.title}>{title}</h2>}
      <p className={styles.body}>{children}</p>
    </div>
  );
}
