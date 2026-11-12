/**
 * Bloc « Notre note » : étoiles (enregistrées dès le toucher), commentaire commun,
 * et bouton « Cuisinée aujourd'hui ».
 */
import { useState } from 'react';
import { useAddCookEntry, useSetComment, useSetRating } from '../../data/hooks';
import { formatRating, formatShortDate, toLocalIsoDate } from '../../domain/format';
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
  const cookedToday = recipe.cookLog[0]?.cookedOn === today;
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

      {failed && (
        <p className={styles.error} role="alert">
          {strings.detail.actionError}
        </p>
      )}
    </section>
  );
}
