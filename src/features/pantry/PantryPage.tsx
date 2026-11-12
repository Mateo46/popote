/**
 * Onglet Mon frigo : on indique ce qu'on a, l'app classe les recettes par part
 * d'ingrédients disponibles et liste ce qui manque. Le contenu du frigo est commun
 * au foyer et conservé d'une visite à l'autre.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { usePantryEntries, usePantryMutations, useRecipes } from '../../data/hooks';
import type { PantryEntry } from '../../data/pantry';
import { ingredientKey } from '../../domain/ingredients';
import { matchPantry, suggestIngredients, type PantryMatch } from '../../domain/pantryMatch';
import type { Recipe } from '../../domain/recipe';
import { strings } from '../../strings';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { RecipeList } from '../recipes/RecipeList';
import styles from './PantryPage.module.css';

/** Nombre d'ingrédients manquants affichés avant « +N ». */
const MISSING_SHOWN = 3;

// Valeurs par défaut stables pendant le chargement (évitent de recalculer à chaque rendu).
const noRecipes: Recipe[] = [];
const noEntries: PantryEntry[] = [];

export function PantryPage() {
  const { data: recipes = noRecipes } = useRecipes();
  const { data: items = noEntries } = usePantryEntries('pantry_items');
  const { data: staples = noEntries } = usePantryEntries('pantry_staples');
  const { add, remove, clear } = usePantryMutations('pantry_items');
  const [text, setText] = useState('');

  const stapleLabels = staples.map((staple) => staple.label);
  const matches = useMemo(
    () =>
      matchPantry(
        recipes,
        items.map((item) => item.label),
        staples.map((staple) => staple.label),
      ),
    [recipes, items, staples],
  );
  const matchById = new Map(matches.map((match) => [match.recipe.id, match]));

  const excluded = new Set([...items, ...staples].map((entry) => ingredientKey(entry.label)));
  const suggestions = suggestIngredients(recipes, text, excluded);

  function addLabel(label: string) {
    const clean = label.trim();
    if (!clean) return;
    if (!excluded.has(ingredientKey(clean))) add.mutate(clean);
    setText('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    addLabel(text);
  }

  return (
    <Screen title={strings.pantry.title} subtitle={strings.pantry.subtitle}>
      <form className={styles.box} onSubmit={handleSubmit}>
        {items.map((item) => (
          <span key={item.normalized} className={styles.chip}>
            {item.label}
            <button
              type="button"
              aria-label={strings.pantry.remove(item.label)}
              onClick={() => remove.mutate(item.normalized)}
            >
              <Icon name="close" size={16} />
            </button>
          </span>
        ))}
        <input
          id="pantry-input"
          className={styles.input}
          aria-label={strings.pantry.inputLabel}
          placeholder={strings.pantry.placeholder}
          enterKeyHint="done"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </form>

      {suggestions.length > 0 && (
        <div className={styles.suggestions} role="group" aria-label={strings.pantry.suggestions}>
          {suggestions.map((label) => (
            <button
              key={label}
              type="button"
              className={styles.suggestion}
              onClick={() => addLabel(label)}
            >
              + {label}
            </button>
          ))}
        </div>
      )}

      <p className={styles.note}>
        {stapleLabels.length > 0 && strings.pantry.staplesNote(stapleLabels.join(', '))}{' '}
        <Link to="/reglages/basiques">{strings.pantry.staplesEdit}</Link>
        {items.length > 0 && (
          <>
            {' · '}
            <button type="button" className={styles.clear} onClick={() => clear.mutate()}>
              {strings.pantry.clear}
            </button>
          </>
        )}
      </p>

      {items.length === 0 && <EmptyState>{strings.pantry.emptyBody}</EmptyState>}
      {items.length > 0 && matches.length === 0 && (
        <EmptyState>{strings.pantry.noMatch}</EmptyState>
      )}

      {matches.length > 0 && (
        <>
          <h2 className={styles.label}>
            {strings.pantry.results}
            <em>{strings.pantry.outOf(recipes.length)}</em>
          </h2>
          <RecipeList
            recipes={matches.map((match) => match.recipe)}
            renderDetail={(recipe) => <Missing match={matchById.get(recipe.id)} />}
            renderAside={(recipe) => <Score match={matchById.get(recipe.id)} />}
          />
        </>
      )}
    </Screen>
  );
}

function Missing({ match }: { match: PantryMatch<Recipe> | undefined }) {
  if (!match) return null;
  if (!match.missing.length)
    return <span className={styles.complete}>{strings.pantry.complete}</span>;
  const shown = match.missing.slice(0, MISSING_SHOWN);
  const rest = match.missing.length - shown.length;
  return (
    <>
      {strings.pantry.missing}
      <b className={styles.missing}>{shown.join(', ').toLowerCase()}</b>
      {rest > 0 && strings.pantry.more(rest)}
    </>
  );
}

function Score({ match }: { match: PantryMatch<Recipe> | undefined }) {
  if (!match) return null;
  const percent = Math.round((match.owned / match.required) * 100);
  return (
    <span className={styles.score} aria-label={strings.pantry.score(match.owned, match.required)}>
      <b aria-hidden="true">
        {match.owned}
        <small>/{match.required}</small>
      </b>
      <span className={styles.bar} aria-hidden="true">
        <i style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}
