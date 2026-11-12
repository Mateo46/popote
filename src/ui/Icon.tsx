/**
 * Jeu d'icônes unique de l'app : SVG au trait de 1,75 px, extrémités arrondies.
 * Pour ajouter une icône, ajouter son tracé (grille 24 × 24) dans `paths`.
 */
import type { ReactElement } from 'react';
import styles from './Icon.module.css';

const paths = {
  book: (
    <>
      <path d="M5 4.5h10.5A3.5 3.5 0 0119 8v11.5H8.5A3.5 3.5 0 015 16z" />
      <path d="M5 16a3.5 3.5 0 013.5-3.5H19" />
    </>
  ),
  basket: (
    <>
      <path d="M3.5 10h17l-1.6 8.2a2 2 0 01-2 1.6H7.1a2 2 0 01-2-1.6z" />
      <path d="M8 10l3-5.5M16 10l-3-5.5M9.5 14v2.5M14.5 14v2.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4L6 18M18 18l-1.6-1.6M7.6 7.6L6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M14.5 6l-6 6 6 6" />,
  chevron: <path d="M9.5 6l6 6-6 6" />,
  close: <path d="M7 7l10 10M17 7L7 17" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
} satisfies Record<string, ReactElement>;

export type IconName = keyof typeof paths;

interface IconProps {
  name: IconName;
  /** Taille en px (22 par défaut, 16 pour les icônes dans le texte). */
  size?: number;
  /** Version pleine (onglet actif), comme les symboles iOS remplis. */
  filled?: boolean;
}

/** Icône décorative : le libellé accessible est porté par le bouton ou le lien parent. */
export function Icon({ name, size = 22, filled = false }: IconProps) {
  return (
    <svg
      className={filled ? `${styles.icon} ${styles.filled}` : styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
