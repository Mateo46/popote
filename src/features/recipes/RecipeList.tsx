/**
 * Liste de recettes : vignette, titre (deux lignes au plus), sous-titre et ligne
 * « ★ 4,5 · 35 min · Il y a 12 j ». Réutilisée par la recherche et « Mon frigo » :
 * - `renderDetail` remplace le sous-titre (« Ingrédient : patate douce », « Manque : … ») ;
 * - `renderAside` ajoute un élément à droite (score « 6/8 ») et masque la ligne de méta.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { usePhotoUrls } from '../../data/hooks';
import { thumbPath } from '../../data/images';
import { formatDaysAgo, formatMinutes } from '../../domain/format';
import { coverPhoto, durationMinutes, type Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { PhotoImage } from '../../ui/PhotoImage';
import { RatingBadge } from '../../ui/StarRating';
import styles from './RecipeList.module.css';

interface RecipeListProps {
  recipes: Recipe[];
  renderDetail?: (recipe: Recipe) => ReactNode;
  renderAside?: (recipe: Recipe) => ReactNode;
  /** Appelé quand on ouvre une recette (par ex. pour retenir la recherche). */
  onOpen?: (recipe: Recipe) => void;
}

export function RecipeList({ recipes, renderDetail, renderAside, onOpen }: RecipeListProps) {
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
        const detail = renderDetail ? renderDetail(recipe) : recipe.subtitle;
        return (
          <li key={recipe.id}>
            <Link
              to={`/recettes/${recipe.id}`}
              className={styles.item}
              onClick={() => onOpen?.(recipe)}
            >
              <PhotoImage src={thumb ? urls?.[thumb] : undefined} className={styles.thumb} />
              <span className={styles.text}>
                <span className={styles.title}>{recipe.title}</span>
                {detail && <span className={styles.subtitle}>{detail}</span>}
                {!renderAside && (
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
                )}
              </span>
              {renderAside?.(recipe)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
