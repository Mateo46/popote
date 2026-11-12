/**
 * Réglages > Toujours disponibles : basiques ignorés par le calcul de « Mon frigo »
 * (sel, poivre, huiles…). Liste commune au foyer.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { usePantryEntries, usePantryMutations } from '../../data/hooks';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import styles from './StaplesPage.module.css';

export function StaplesPage() {
  const navigate = useNavigate();
  const { data: staples = [] } = usePantryEntries('pantry_staples');
  const { add, remove } = usePantryMutations('pantry_staples');
  const [text, setText] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    add.mutate(text);
    setText('');
  }

  return (
    <Screen
      title={strings.staples.title}
      back={{ label: strings.staples.back, onClick: () => navigate('/reglages') }}
    >
      <p className={styles.intro}>{strings.staples.intro}</p>

      <ul className={styles.group}>
        {staples.map((staple) => (
          <li key={staple.normalized} className={styles.row}>
            <span>{staple.label}</span>
            <button
              type="button"
              className={styles.remove}
              aria-label={strings.staples.remove(staple.label)}
              onClick={() => remove.mutate(staple.normalized)}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
        <li>
          <form className={styles.addRow} onSubmit={handleSubmit}>
            <input
              id="staple-input"
              aria-label={strings.staples.inputLabel}
              placeholder={strings.staples.placeholder}
              enterKeyHint="done"
              autoComplete="off"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={!text.trim()}>
              {strings.staples.add}
            </Button>
          </form>
        </li>
      </ul>
    </Screen>
  );
}
