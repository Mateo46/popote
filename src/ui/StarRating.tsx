/**
 * Note de 0 à 5 par demi-étoile.
 *
 * Toucher la moitié gauche d'une étoile donne x,5, la moitié droite x ; toucher la note
 * actuelle l'efface. Au clavier (et avec VoiceOver), c'est un curseur : flèches ±0,5.
 */
import type { KeyboardEvent, MouseEvent } from 'react';
import { formatRating } from '../domain/format';
import { ratingFromPointer } from './rating';
import styles from './StarRating.module.css';

const STAR_PATH = 'M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
}

export function StarRating({ value, onChange, label }: StarRatingProps) {
  const current = value ?? 0;

  function handleClick(event: MouseEvent<HTMLSpanElement>, index: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width ? (event.clientX - rect.left) / rect.width : 1;
    onChange(ratingFromPointer(index, x, value));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = Math.min(5, Math.max(0, current + step));
    onChange(next === 0 ? null : next);
  }

  return (
    <div
      className={styles.stars}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={current}
      aria-valuetext={value === null ? 'Non notée' : `${formatRating(value)} sur 5`}
      onKeyDown={handleKeyDown}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, current - index));
        return (
          <span
            key={index}
            className={styles.star}
            data-testid={`star-${index + 1}`}
            onClick={(event) => handleClick(event, index)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.empty}>
              <path d={STAR_PATH} />
            </svg>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={styles.full}
              style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
            >
              <path d={STAR_PATH} />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

/** Petite étoile pleine suivie de la note, pour les listes : « ★ 4,5 ». */
export function RatingBadge({ value }: { value: number }) {
  return (
    <span className={styles.badge}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR_PATH} />
      </svg>
      <span className="visually-hidden">Note : </span>
      {formatRating(value)}
    </span>
  );
}
