/** Onglet Réglages : apparence, compte et version. Le reste arrive avec les phases suivantes. */
import { signOut, useAuth } from '../../data/auth';
import { strings } from '../../strings';
import { Group, Row } from '../../ui/Group';
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
