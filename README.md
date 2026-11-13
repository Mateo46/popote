# Popote

Carnet de recettes HelloFresh partagé par un foyer, installable sur iPhone comme une app
(PWA) : https://mateo46.github.io/popote/

- **Ajout** d'une recette par lien hellofresh.fr (photo, ingrédients, étapes, nutrition
  importés et copiés dans Supabase) ou saisie manuelle.
- **Recherche** instantanée (titre, ingrédient, tag, sans accents), filtres.
- **Mon frigo** : recettes classées selon les ingrédients disponibles.
- **Notes** en demi-étoiles, commentaire, historique « cuisinée le… », photos du foyer.
- **Hors connexion** : consultation des recettes déjà chargées. **Export** JSON.
- Interface iOS 26/27 (Liquid Glass), thèmes clair et sombre.

- **Plan et avancement** : [PLAN.md](PLAN.md)
- **Architecture et décisions** : [docs/architecture.md](docs/architecture.md)
- **Design** (tokens, Liquid Glass, composants) : [docs/design.md](docs/design.md)

## Technologies

React 19 + TypeScript (strict) + Vite, React Router, TanStack Query, Zod. Données,
comptes et photos dans Supabase (Postgres, Auth, Storage). Publication sur GitHub Pages.

## Démarrer en local

Prérequis : Node.js LTS (version dans [.nvmrc](.nvmrc), 24 minimum).

```bash
npm install
cp .env.example .env.local   # puis remplir les deux valeurs Supabase
npm run dev                  # http://localhost:5173
```

Sans configuration Supabase valide, l'app affiche un écran « Configuration incomplète »
qui indique la variable en cause.

## Commandes

| Commande                          | Rôle                                          |
| --------------------------------- | --------------------------------------------- |
| `npm run dev`                     | serveur de développement                      |
| `npm run build`                   | build de production dans `dist/`              |
| `npm run preview`                 | sert le build localement                      |
| `npm run check`                   | lint + format + types + tests (comme la CI)   |
| `npm test` / `npm run test:watch` | tests unitaires et d'écran (Vitest)           |
| `npm run test:e2e`                | tests de parcours (Playwright, voir plus bas) |
| `npm run format`                  | reformate le code (Prettier)                  |

## Structure

```
src/
  domain/     logique métier pure, sans React ni réseau (recherche, score « Mon frigo »…)
  data/       seul accès à Supabase : client, authentification, requêtes
  features/   un dossier par écran : auth, recipes (liste), recipe-detail, recipe-form,
              add-recipe (feuille « Ajouter »), search, pantry, settings, shell
  ui/         composants génériques (TabBar, Screen, Button, Icon…) et thème
  styles/     tokens.css (couleurs, typo, Liquid Glass), reset, styles globaux
  strings.ts  tous les textes de l'interface
supabase/migrations/   schéma SQL versionné (tables, RLS, stockage)
supabase/functions/    Edge Function d'import HelloFresh (+ fixtures de test)
e2e/                   tests de parcours Playwright et faux serveur Supabase
.github/workflows/     CI, déploiement GitHub Pages, keepalive Supabase
mockups/               maquettes validées (les photos ne sont pas versionnées)
```

Règle principale : **les écrans n'appellent jamais Supabase directement**, ils passent par
`src/data/`. ESLint refuse l'import de `@supabase/supabase-js` ailleurs.

## Base de données (Supabase)

Le schéma est dans `supabase/migrations/`. Pour l'appliquer à un projet :

- **Le plus simple** : Supabase > SQL Editor > coller le contenu du fichier > Run.
- **Avec la CLI** (si vous préférez) :
  ```bash
  npx supabase login
  npx supabase link --project-ref <id-du-projet>
  npx supabase db push
  ```

Une nouvelle évolution du schéma = un **nouveau** fichier de migration daté. Ne jamais
modifier une migration déjà appliquée.

Comptes : les inscriptions sont désactivées (Authentication > Sign In / Providers >
« Allow new users to sign up » décoché). Les membres du foyer sont créés dans
Authentication > Users > Add user.

Sécurité : seul un utilisateur connecté peut lire ou écrire (RLS). La clé publique
(`anon` / `publishable`) peut figurer dans l'app ; la clé `service_role` / `secret`
**ne doit jamais** être versionnée ni envoyée au navigateur.

## Tests

- **Unitaires et d'écran** (`npm test`, Vitest + Testing Library) : logique du domaine
  (formats, tri, recherche, score du frigo, normalisation des ingrédients), formulaire,
  extracteur HelloFresh sur fixtures, écrans avec données simulées.
- **Parcours** (`npm run test:e2e`, Playwright) : connexion, recherche, notation, sur un
  écran d'iPhone, en thème clair puis sombre, avec un contrôle d'accessibilité **axe**
  (aucune violation grave tolérée, contrastes compris). L'app est construite avec une
  fausse adresse Supabase et le réseau est simulé (`e2e/mockSupabase.ts`) : aucune donnée
  réelle, aucun secret. Première fois : `npx playwright install chromium`.

La CI (GitHub Actions) lance les deux à chaque push.

## Hors connexion et export

- Le cache des données est enregistré dans IndexedDB (`src/data/offline.ts`, 30 jours)
  et les photos par le service worker (`vite.config.ts`). Hors connexion, un bandeau
  l'indique et les modifications sont désactivées. La déconnexion efface ce cache.
- Réglages > Données > Exporter : fichier JSON avec recettes, notes, commentaires,
  historique, frigo et basiques (les photos restent dans Supabase, le fichier donne leurs
  chemins). Sur iPhone, le menu de partage permet de l'enregistrer dans Fichiers.

## Tâches courantes

- **Ajouter un synonyme d'ingrédient** (« Mon frigo », recherche) : une ligne dans
  `synonyms` de `src/domain/ingredients.ts`, plus un cas dans `ingredients.test.ts`.
- **Modifier un texte de l'interface** : `src/strings.ts`.
- **Changer une couleur** : `src/styles/tokens.css` (les deux thèmes), puis
  `npm run test:e2e` pour vérifier les contrastes.
- **Ajouter une recette en masse** : voir « Import de l'historique » dans
  `docs/architecture.md`.

## Fonction d'import HelloFresh (Edge Function)

L'import par lien passe par `supabase/functions/import-hellofresh/` : `index.ts` (serveur
Deno : vérifie l'adresse, suit les redirections sans quitter hellofresh.fr) et
`extract.ts` (lecture de la page, logique pure testée avec Vitest sur les fixtures).

Déployer après chaque modification de ces fichiers :

```bash
npx supabase login
npx supabase functions deploy import-hellofresh --project-ref <id-du-projet> --use-api
```

L'appel est réservé aux utilisateurs connectés (`verify_jwt = true` dans
`supabase/config.toml`). Journaux : Supabase > Edge Functions > import-hellofresh > Logs.

Si HelloFresh change son site, l'import peut échouer ou tomber sur le JSON-LD (données
partielles, signalées dans l'écran de relecture). Enregistrer alors une nouvelle page en
fixture (sans les textes des étapes, le dépôt étant public), adapter `extract.ts`, lancer
`npm test`, puis redéployer.

## Déploiement (GitHub Pages)

Automatique à chaque push sur `main` ([deploy.yml](.github/workflows/deploy.yml)).
Configuration à faire une fois dans le dépôt GitHub :

1. Settings > Pages > Source : **GitHub Actions**.
2. Settings > Secrets and variables > Actions > onglet **Variables** :
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.

L'app est alors servie sur `https://<compte>.github.io/popote/`.

### Installer sur iPhone

Ouvrir l'adresse dans **Safari** > bouton Partager > **Sur l'écran d'accueil**. Se
connecter ensuite depuis l'icône (l'app installée a sa propre session, distincte de Safari).

## Dépannage

**Supabase est en pause.** L'offre gratuite suspend un projet inactif 7 jours. Le workflow
[keepalive.yml](.github/workflows/keepalive.yml) l'évite (lundi et jeudi) ; s'il échoue,
GitHub envoie un e-mail. Pour réactiver : tableau de bord Supabase > projet > **Restore**.

**L'app ne se met pas à jour sur l'iPhone.** Le service worker installe la nouvelle
version en arrière-plan : fermer complètement l'app puis la rouvrir.

**Mettre à jour les dépendances.** `npm outdated`, puis mettre à jour par petits groupes
et lancer `npm run check` et `npm run build` après chaque groupe. Rester sur des versions
stables (pas de bêta) et sur la version LTS active de Node.js.
