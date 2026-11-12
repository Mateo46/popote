/**
 * Onglet Recherche, à la manière d'iOS 26/27 : la barre d'onglets se réduit à un rond
 * (retour aux recettes) et le champ de recherche s'affiche en bas, près du pouce.
 * Le texte cherché est gardé dans l'adresse (?q=…) pour survivre au retour arrière.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useRecipes } from '../../data/hooks';
import type { Recipe } from '../../domain/recipe';
import {
  hasActiveFilters,
  noFilters,
  queryTokens,
  searchRecipes,
  topTags,
  type SearchFilters,
  type SearchHit,
} from '../../domain/search';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Highlight } from '../../ui/Highlight';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { useKeyboardInset } from '../../ui/useKeyboardInset';
import { RecipeList } from '../recipes/RecipeList';
import { clearRecentSearches, readRecentSearches, rememberSearch } from './recentSearches';
import styles from './SearchPage.module.css';

type ToggleKey = 'minRating' | 'maxMinutes' | 'neverCooked' | 'notRated';

const toggles: { key: ToggleKey; label: string; on: Partial<SearchFilters> }[] = [
  { key: 'minRating', label: strings.search.minRating, on: { minRating: 4 } },
  { key: 'maxMinutes', label: strings.search.maxMinutes, on: { maxMinutes: 30 } },
  { key: 'neverCooked', label: strings.search.neverCooked, on: { neverCooked: true } },
  { key: 'notRated', label: strings.search.notRated, on: { notRated: true } },
];

const isOn = (filters: SearchFilters, key: ToggleKey) =>
  key === 'minRating' || key === 'maxMinutes' ? filters[key] !== null : filters[key];

export function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [filters, setFilters] = useState<SearchFilters>(noFilters);
  const [recent, setRecent] = useState(readRecentSearches);
  const keyboard = useKeyboardInset();
  const { data: recipes = [] } = useRecipes();

  const tags = useMemo(() => topTags(recipes, 4), [recipes]);
  const hits = useMemo(() => searchRecipes(recipes, query, filters), [recipes, query, filters]);
  const tokens = useMemo(() => queryTokens(query), [query]);
  const searching = tokens.length > 0 || hasActiveFilters(filters);

  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true });

  function toggle(key: ToggleKey, on: Partial<SearchFilters>) {
    setFilters((current) =>
      isOn(current, key) ? { ...current, [key]: noFilters[key] } : { ...current, ...on },
    );
  }

  function toggleTag(tag: string) {
    setFilters((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((other) => other !== tag)
        : [...current.tags, tag],
    }));
  }

  const hitById = new Map(hits.map((hit) => [hit.recipe.id, hit]));

  return (
    <Screen title={strings.search.title}>
      <div className={styles.chips} role="group" aria-label={strings.search.filtersLabel}>
        {toggles.map(({ key, label, on }) => (
          <button
            key={key}
            type="button"
            className={styles.chip}
            aria-pressed={isOn(filters, key)}
            onClick={() => toggle(key, on)}
          >
            {label}
          </button>
        ))}
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={styles.chip}
            aria-pressed={filters.tags.includes(tag)}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {searching && hits.length > 0 && (
        <>
          <h2 className={styles.label}>
            {strings.search.results}
            <em>{strings.search.count(hits.length)}</em>
          </h2>
          <RecipeList
            recipes={hits.map((hit) => hit.recipe)}
            renderDetail={(recipe) => detailFor(hitById.get(recipe.id), tokens)}
            onOpen={() => setRecent(rememberSearch(query))}
          />
        </>
      )}

      {searching && hits.length === 0 && (
        <div className={styles.empty}>
          <p>{strings.search.noResults}</p>
          {hasActiveFilters(filters) && (
            <Button variant="secondary" onClick={() => setFilters(noFilters)}>
              {strings.search.removeFilters}
            </Button>
          )}
        </div>
      )}

      {!searching && recent.length > 0 && (
        <section>
          <h2 className={styles.label}>
            {strings.search.recent}
            <button
              type="button"
              className={styles.clearRecent}
              onClick={() => {
                clearRecentSearches();
                setRecent([]);
              }}
            >
              {strings.search.clearRecent}
            </button>
          </h2>
          <ul className={styles.group}>
            {recent.map((item) => (
              <li key={item}>
                <button type="button" className={styles.recent} onClick={() => setQuery(item)}>
                  <Icon name="search" size={16} />
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!searching && recent.length === 0 && <EmptyState>{strings.search.emptyBody}</EmptyState>}

      <form
        className={styles.bar}
        style={{ transform: keyboard ? `translateY(-${keyboard}px)` : undefined }}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur(); // referme le clavier
        }}
      >
        <button
          type="button"
          className={`${styles.mini} glass`}
          aria-label={strings.search.backToRecipes}
          onClick={() => navigate('/')}
        >
          <Icon name="book" size={24} />
        </button>
        <label className={`${styles.field} glass`}>
          <Icon name="search" size={18} />
          <input
            id="search-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            aria-label={strings.search.fieldLabel}
            placeholder={strings.search.placeholder}
            value={query}
            autoFocus={!query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label={strings.search.clear}
              onClick={() => setQuery('')}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </label>
      </form>
    </Screen>
  );
}

/** Ligne d'explication sous le titre : sous-titre surligné, ingrédient ou tag trouvé. */
function detailFor(hit: SearchHit<Recipe> | undefined, tokens: string[]): ReactNode {
  if (!hit) return null;
  const { recipe, field, matched } = hit;
  if (field === 'ingredient' && matched) {
    return (
      <>
        {strings.search.inIngredient}
        <Highlight text={matched} tokens={tokens} />
      </>
    );
  }
  if (field === 'tag' && matched) {
    return (
      <>
        {strings.search.inTag}
        <Highlight text={matched} tokens={tokens} />
      </>
    );
  }
  return recipe.subtitle ? <Highlight text={recipe.subtitle} tokens={tokens} /> : null;
}
