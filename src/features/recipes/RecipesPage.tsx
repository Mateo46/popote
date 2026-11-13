/**
 * Onglet Recettes (accueil) : tri par puces, liste des recettes, bouton « + ».
 * Le tri choisi est gardé dans l'adresse (?tri=…) pour survivre au retour arrière.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useRecipes } from '../../data/hooks';
import { AddSheet } from '../add-recipe/AddSheet';
import { recipeSortLabels, recipeSorts, sortRecipes, type RecipeSort } from '../../domain/sort';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { GlassButton } from '../../ui/GlassButton';
import { useOnline } from '../../ui/useOnline';
import { Screen } from '../../ui/Screen';
import { RecipeList } from './RecipeList';
import styles from './RecipesPage.module.css';

function isSort(value: string | null): value is RecipeSort {
  return recipeSorts.includes(value as RecipeSort);
}

export function RecipesPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tri');
  const sort: RecipeSort = isSort(requested) ? requested : 'rating';
  const { data: recipes, isPending, isError, refetch } = useRecipes();
  const [adding, setAdding] = useState(false);
  const online = useOnline();

  const addButton = (
    <>
      <GlassButton
        icon="plus"
        label={online ? strings.recipes.add : strings.offline.actionDisabled}
        disabled={!online}
        onClick={() => setAdding(true)}
      />
      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );

  return (
    <Screen
      title={strings.recipes.title}
      subtitle={recipes ? strings.recipes.count(recipes.length) : undefined}
      actions={addButton}
    >
      {isPending && <p className={styles.status}>{strings.recipes.loading}</p>}

      {isError && (
        <div className={styles.status} role="alert">
          <p>{strings.recipes.loadError}</p>
          <Button variant="secondary" onClick={() => void refetch()}>
            {strings.recipes.retry}
          </Button>
        </div>
      )}

      {recipes && recipes.length === 0 && (
        <EmptyState title={strings.recipes.emptyTitle}>{strings.recipes.emptyBody}</EmptyState>
      )}

      {recipes && recipes.length > 0 && (
        <>
          <div className={styles.chips} role="group" aria-label={strings.recipes.sortLabel}>
            {recipeSorts.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.chip}
                aria-pressed={option === sort}
                onClick={() =>
                  setParams(option === 'rating' ? {} : { tri: option }, { replace: true })
                }
              >
                {recipeSortLabels[option]}
              </button>
            ))}
          </div>
          <RecipeList recipes={sortRecipes(recipes, sort)} />
        </>
      )}
    </Screen>
  );
}
