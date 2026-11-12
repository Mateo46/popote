/**
 * Menu « … » en Liquid Glass : un bouton rond qui ouvre une liste d'actions.
 * Se ferme en touchant ailleurs, avec la touche Échap ou après un choix.
 */
import { useEffect, useRef, useState } from 'react';
import { GlassButton } from './GlassButton';
import { Icon, type IconName } from './Icon';
import styles from './ActionMenu.module.css';

export interface MenuAction {
  label: string;
  icon: IconName;
  onSelect: () => void;
  /** Action destructrice, affichée en rouge. */
  danger?: boolean;
}

export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={ref} className={styles.anchor}>
      <GlassButton
        icon="more"
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div className={`${styles.menu} glass`} role="menu" aria-label={label}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={action.danger ? styles.danger : undefined}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              <Icon name={action.icon} size={18} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
