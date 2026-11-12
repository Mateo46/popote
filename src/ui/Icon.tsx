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
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 015.5 7h2.3l1.5-2h5.4l1.5 2h2.3A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  pencil: (
    <>
      <path d="M15 5l4 4L8.5 19.5H4.5v-4z" />
      <path d="M13 7l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
      <path d="M10.5 11v5M13.5 11v5" />
    </>
  ),
  paste: (
    <>
      <rect x="6" y="5" width="12" height="15" rx="2" />
      <path d="M9.5 5V3.5h5V5M9.5 10h5M9.5 13.5h5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10M19.5 4.5L11 13" />
      <path d="M17 14v4.5a1 1 0 01-1 1H5.5a1 1 0 01-1-1V8a1 1 0 011-1H10" />
    </>
  ),
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
