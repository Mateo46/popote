/**
 * Liste de recettes : vignette, titre (deux lignes au plus), sous-titre et ligne
 * « ★ 4,5 · 35 min · Il y a 12 j ». Réutilisée par la recherche et « Mon frigo ».
 */
import { Link } from 'react-router';
import { usePhotoUrls } from '../../data/hooks';
import { thumbPath } from '../../data/images';
import { formatDaysAgo, formatMinutes } from '../../domain/format';
import { coverPhoto, durationMinutes, type Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { PhotoImage } from '../../ui/PhotoImage';
import { RatingBadge } from '../../ui/StarRating';
import styles from './RecipeList.module.css';

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const thumbs = recipes.map((recipe) => {
    const cover = coverPhoto(recipe);
    return cover ? thumbPath(cover.path) : null;
  });
  const { data: urls } = usePhotoUrls(thumbs.filter((path): path is string => path !== null));
  const today = new Date();

  return (
    <ul className={styles.list}>
      {recipes.map((recipe, index) => {
        const thumb = thumbs[index];
        const minutes = durationMinutes(recipe);
        const lastCooked = recipe.cookLog[0]?.cookedOn;
        return (
          <li key={recipe.id}>
            <Link to={`/recettes/${recipe.id}`} className={styles.item}>
              <PhotoImage src={thumb ? urls?.[thumb] : undefined} className={styles.thumb} />
              <span className={styles.text}>
                <span className={styles.title}>{recipe.title}</span>
                {recipe.subtitle && <span className={styles.subtitle}>{recipe.subtitle}</span>}
                <span className={styles.meta}>
                  {recipe.rating !== null ? (
                    <RatingBadge value={recipe.rating} />
                  ) : (
                    <span className={styles.dim}>{strings.recipes.notRated}</span>
                  )}
                  {minutes !== null && <span>{formatMinutes(minutes)}</span>}
                  <span className={styles.dot} aria-hidden="true" />
                  {lastCooked ? (
                    <span>{formatDaysAgo(lastCooked, today)}</span>
                  ) : (
                    <span className={styles.dim}>{strings.recipes.neverCooked}</span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
