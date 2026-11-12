/** Onglet Réglages : apparence, basiques de « Mon frigo », compte et version. */
import { Link } from 'react-router';
import { signOut, useAuth } from '../../data/auth';
import { usePantryEntries } from '../../data/hooks';
import { strings } from '../../strings';
import { Group, Row } from '../../ui/Group';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { setThemePreference, useThemePreference, type ThemePreference } from '../../ui/theme';
import styles from './SettingsPage.module.css';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: strings.settings.themeSystem },
  { value: 'light', label: strings.settings.themeLight },
  { value: 'dark', label: strings.settings.themeDark },
];

export function SettingsPage() {
  const auth = useAuth();
  const theme = useThemePreference();
  const { data: staples } = usePantryEntries('pantry_staples');

  return (
    <Screen title={strings.settings.title}>
      <section className={styles.section}>
        <h2 className={styles.label}>{strings.settings.appearance}</h2>
        <div className={styles.inset}>
          <SegmentedControl
            label={strings.settings.appearance}
            options={themeOptions}
            value={theme}
            onChange={setThemePreference}
          />
        </div>
      </section>

      <Group label={strings.settings.pantry}>
        <Link to="/reglages/basiques" className={styles.linkRow}>
          <span>{strings.staples.title}</span>
          <span className={styles.value}>
            {staples ? strings.staples.count(staples.length) : ''}
          </span>
          <Icon name="chevron" size={16} />
        </Link>
      </Group>

      <Group label={strings.settings.account}>
        <Row>{auth.status === 'signedIn' ? auth.email : ''}</Row>
        <div className={styles.signOutRow}>
          <button type="button" className={styles.signOut} onClick={() => void signOut()}>
            {strings.settings.signOut}
          </button>
        </div>
      </Group>

      <p className={styles.version}>{strings.settings.version(__APP_VERSION__)}</p>
    </Screen>
  );
}
