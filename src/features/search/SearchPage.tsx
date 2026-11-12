/** Onglet Recherche. Le moteur de recherche arrive en phase 5. */
import { strings } from '../../strings';
import { EmptyState } from '../../ui/EmptyState';
import { Screen } from '../../ui/Screen';

export function SearchPage() {
  return (
    <Screen title={strings.search.title}>
      <EmptyState>{strings.search.emptyBody}</EmptyState>
    </Screen>
  );
}
