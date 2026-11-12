/**
 * Image d'une photo privée : affiche une surface neutre tant que l'URL signée
 * n'est pas disponible (ou si la recette n'a pas de photo).
 */
import styles from './PhotoImage.module.css';

interface PhotoImageProps {
  src: string | undefined;
  alt?: string;
  className?: string | undefined;
}

export function PhotoImage({ src, alt = '', className }: PhotoImageProps) {
  const classes = [styles.photo, className].filter(Boolean).join(' ');
  if (!src) return <span className={classes} role={alt ? 'img' : undefined} aria-label={alt} />;
  return <img className={classes} src={src} alt={alt} loading="lazy" decoding="async" />;
}
