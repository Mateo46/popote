/**
 * Barre d'onglets flottante en Liquid Glass, avec l'onglet Recherche séparé à droite
 * (recommandation des Human Interface Guidelines d'Apple pour iOS 26/27).
 * « Ajouter » n'est pas un onglet : c'est une action, portée par l'écran Recettes.
 */
import { Link, useLocation } from 'react-router';
import { strings } from '../strings';
import { Icon, type IconName } from './Icon';
import styles from './TabBar.module.css';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  /** Indique si l'onglet est actif pour un chemin donné (sous-pages comprises). */
  matches: (pathname: string) => boolean;
}

const tabs: Tab[] = [
  {
    to: '/',
    label: strings.tabs.recipes,
    icon: 'book',
    // La fiche d'une recette (/recettes/…) reste dans l'onglet Recettes.
    matches: (path) => path === '/' || path.startsWith('/recettes'),
  },
  {
    to: '/frigo',
    label: strings.tabs.pantry,
    icon: 'basket',
    matches: (path) => path.startsWith('/frigo'),
  },
  {
    to: '/reglages',
    label: strings.tabs.settings,
    icon: 'gear',
    matches: (path) => path.startsWith('/reglages'),
  },
];

export function TabBar() {
  const { pathname } = useLocation();
  const searchActive = pathname.startsWith('/recherche');

  return (
    <nav className={styles.bar} aria-label="Onglets">
      <div className={`${styles.tabs} glass`}>
        {tabs.map((tab) => {
          const active = tab.matches(pathname);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={styles.tab}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={tab.icon} size={24} filled={active} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <Link
        to="/recherche"
        className={`${styles.search} glass`}
        aria-label={strings.tabs.search}
        aria-current={searchActive ? 'page' : undefined}
      >
        <Icon name="search" size={24} />
      </Link>
    </nav>
  );
}
