/** Onglet Mon frigo. Le calcul de correspondance arrive en phase 5. */
import { strings } from '../../strings';
import { EmptyState } from '../../ui/EmptyState';
import { Screen } from '../../ui/Screen';

export function PantryPage() {
  return (
    <Screen title={strings.pantry.title} subtitle={strings.pantry.subtitle}>
      <EmptyState>{strings.pantry.emptyBody}</EmptyState>
    </Screen>
  );
}
