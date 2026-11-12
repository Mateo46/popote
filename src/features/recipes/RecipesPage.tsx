/** Onglet Recettes (accueil). La liste arrive en phase 4. */
import { strings } from '../../strings';
import { EmptyState } from '../../ui/EmptyState';
import { Screen } from '../../ui/Screen';

export function RecipesPage() {
  return (
    <Screen title={strings.recipes.title}>
      <EmptyState title={strings.recipes.emptyTitle}>{strings.recipes.emptyBody}</EmptyState>
    </Screen>
  );
}
