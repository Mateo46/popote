/**
 * Bouton en pilule. Une seule action « primary » par écran (couleur d'accent pleine) ;
 * les actions secondaires utilisent « secondary » (fond d'accent atténué).
 */
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  /** Occupe toute la largeur disponible. */
  block?: boolean;
}

export function Button({
  variant = 'primary',
  block = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], block && styles.block, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...props} />;
}
