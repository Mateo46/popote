/**
 * Bouton rond de 44 px en Liquid Glass, posé sur le contenu (retour, « + », menu…).
 * `tint` : variante teintée de l'accent, réservée à l'action de validation.
 */
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './GlassButton.module.css';

interface GlassButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Libellé lu par VoiceOver (le bouton n'affiche qu'une icône). */
  label: string;
  tint?: boolean;
}

export function GlassButton({ icon, label, tint = false, className, ...props }: GlassButtonProps) {
  const classes = [styles.button, 'glass', tint && styles.tint, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} aria-label={label} {...props}>
      <Icon name={icon} />
    </button>
  );
}
