/**
 * Bloc « Notre note » : étoiles (enregistrées dès le toucher), commentaire commun,
 * « Cuisinée aujourd'hui » et ajout d'une autre date (calendrier natif).
 */
import { useEffect, useRef, useState } from 'react';
import { useAddCookEntry, useSetComment, useSetRating } from '../../data/hooks';
import { formatLongDate, formatRating, formatShortDate, toLocalIsoDate } from '../../domain/format';
import type { Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { StarRating } from '../../ui/StarRating';
import styles from './detail.module.css';

export function RatingCard({ recipe }: { recipe: Recipe }) {
  const setRating = useSetRating();
  const setComment = useSetComment();
  const addCookEntry = useAddCookEntry();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const today = toLocalIsoDate(new Date());
  const cookedOn = new Set(recipe.cookLog.map((entry) => entry.cookedOn));
  const cookedToday = cookedOn.has(today);
  const [dateMessage, setDateMessage] = useState<string | null>(null);

  /** Ajoute une date choisie dans le calendrier (jamais dans le futur, jamais en double). */
  function addDate(value: string) {
    if (!value) return;
    if (value > today) {
      setDateMessage(strings.detail.cookedFuture);
      return;
    }
    if (cookedOn.has(value)) {
      setDateMessage(strings.detail.cookedDuplicate(formatLongDate(value)));
      return;
    }
    setDateMessage(null);
    addCookEntry.mutate({ recipeId: recipe.id, cookedOn: value });
  }
  // Événement natif « change » (et non `onChange` de React, qui suit chaque saisie) : sur
  // iOS, il ne part qu'une fois la date validée dans le sélecteur.
  const dateInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = dateInput.current;
    if (!input) return;
    const onChange = () => {
      addDate(input.value);
      input.value = '';
    };
    input.addEventListener('change', onChange);
    return () => input.removeEventListener('change', onChange);
  });

  const lastCooked = recipe.cookLog[0]?.cookedOn;
  const failed = setRating.isError || setComment.isError || addCookEntry.isError;

  function startEditing() {
    setDraft(recipe.comment ?? '');
    setEditing(true);
  }

  function saveComment() {
    const text = draft.trim();
    setComment.mutate({ id: recipe.id, comment: text || null });
    setEditing(false);
  }

  return (
    <section className={styles.card}>
      <div className={styles.ratingTop}>
        <h2 className={styles.label}>{strings.detail.ratingLabel}</h2>
        <span className={styles.ratingValue}>
          {recipe.rating !== null ? (
            <>
              {formatRating(recipe.rating)}
              <small> / 5</small>
            </>
          ) : (
            <small>{strings.detail.notRated}</small>
          )}
        </span>
      </div>
      <StarRating
        value={recipe.rating}
        label={strings.detail.ratingSlider}
        onChange={(rating) => setRating.mutate({ id: recipe.id, rating })}
      />

      {editing ? (
        <div className={styles.commentEditor}>
          <textarea
            id="recipe-comment"
            value={draft}
            rows={3}
            placeholder={strings.detail.commentPlaceholder}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
          <div className={styles.commentActions}>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {strings.detail.commentCancel}
            </Button>
            <Button onClick={saveComment}>{strings.detail.commentSave}</Button>
          </div>
        </div>
      ) : recipe.comment ? (
        <button type="button" className={styles.comment} onClick={startEditing}>
          {recipe.comment}
          <small>{strings.detail.commentEdit}</small>
        </button>
      ) : (
        <button type="button" className={styles.addComment} onClick={startEditing}>
          <Icon name="pencil" size={16} />
          {strings.detail.commentAdd}
        </button>
      )}

      <div className={styles.cooked}>
        <Button
          disabled={cookedToday || addCookEntry.isPending}
          onClick={() => addCookEntry.mutate({ recipeId: recipe.id, cookedOn: today })}
        >
          <Icon name="check" size={16} />
          {cookedToday ? strings.detail.cookedTodayDone : strings.detail.cookedToday}
        </Button>
        {/* Le champ date est posé, invisible, sur le bouton : le toucher ouvre directement
            le sélecteur de date natif d'iOS. */}
        <label className={styles.otherDate} aria-disabled={addCookEntry.isPending}>
          <Icon name="calendar" size={16} />
          {strings.detail.cookedOtherDate}
          <input
            ref={dateInput}
            id="cooked-date"
            type="date"
            max={today}
            aria-label={strings.detail.cookedOtherDateLabel}
            disabled={addCookEntry.isPending}
          />
        </label>
        <p>
          {lastCooked ? (
            <>
              {strings.detail.cookedCount(recipe.cookLog.length)}
              <br />
              {strings.detail.cookedLast(formatShortDate(lastCooked))}
            </>
          ) : (
            strings.detail.neverCooked
          )}
        </p>
      </div>

      {dateMessage && (
        <p className={styles.error} role="alert">
          {dateMessage}
        </p>
      )}
      {failed && (
        <p className={styles.error} role="alert">
          {strings.detail.actionError}
        </p>
      )}
    </section>
  );
}
