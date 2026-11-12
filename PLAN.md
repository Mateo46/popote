# Plan d'exécution — Carnet de recettes HelloFresh (PWA)

Ce document est le cahier des charges complet. Il est destiné à être exécuté phase par phase
par un agent de développement (par ex. Claude Opus 5.5) et relu par un humain.
Tout ce qui est écrit ici a été décidé avec le propriétaire du projet : ne pas rouvrir ces
décisions, ne pas ajouter de fonctionnalités hors périmètre.

## 0. Règles pour l'agent exécutant

1. Exécuter **une phase à la fois**, dans l'ordre. Une phase est finie quand ses critères
   d'acceptation sont vérifiés (et pas seulement « le code compile »).
2. **Un commit par étape cohérente**, messages en français, à l'impératif.
3. S'arrêter et demander au propriétaire aux **points d'arrêt** marqués ⛔ (validation de
   design, création de comptes, connexion HelloFresh). Ne jamais saisir de mot de passe
   à sa place.
4. Les numéros de version ne sont volontairement pas figés ici : au démarrage, **vérifier
   la version LTS/stable courante** de chaque outil dans sa documentation officielle, puis
   la figer (`.nvmrc`, `engines`, `package-lock.json`). Pas de version bêta ou RC.
5. En cas d'obstacle sur HelloFresh (blocage, structure différente), appliquer le repli
   prévu en phase 1, ne pas contourner de protection anti-robot ni de CAPTCHA.
6. Rapporter honnêtement : ce qui est fait, ce qui est testé, ce qui ne l'est pas.

## 1. Le produit en bref

Application web installable sur iPhone (PWA) pour un couple, en français, qui permet de :

- enregistrer les recettes HelloFresh (site français `www.hellofresh.fr`), environ 100 au
  départ, par **import depuis le site** ou par **scan du feuillet papier** (OCR gratuit,
  exécuté sur le téléphone) ;
- les retrouver : recherche par mot-clé, par ingrédient, filtres, et mode **« Mon frigo »**
  (on indique ce qu'on a, l'app classe les recettes par correspondance) ;
- les noter de 0 à 5 par **demi-étoiles**, avec un **commentaire** ; note et commentaire
  sont **communs** aux deux utilisateurs ;
- garder les photos (site ou feuillet) et **ajouter ses propres photos** du plat réalisé ;
- consulter les **valeurs nutritionnelles** et tenir un **historique « cuisiné le… »** ;
- thème clair et sombre, qui suit le réglage du téléphone par défaut.

### Hors périmètre (ne pas développer)

Application native iOS, OCR payant ou IA de vision, connexion automatisée au compte
HelloFresh depuis l'app, ajustement des portions, mode cuisine, liste de courses, tags
personnalisés, multilingue, notes séparées par utilisateur, écriture hors ligne.

## 2. Choix techniques

| Sujet             | Choix                                                         | Pourquoi                                                                    |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Runtime / outils  | Node.js LTS active, npm                                       | Standard, rien à installer d'exotique                                       |
| Front             | React + TypeScript (mode `strict`) + Vite                     | Écosystème le plus répandu, facile à reprendre                              |
| Routage           | React Router                                                  | Standard                                                                    |
| Données distantes | TanStack Query                                                | Cache, rechargement, persistance hors ligne en lecture                      |
| Validation        | Zod                                                           | Un seul schéma pour les types et la validation des imports                  |
| Styles            | CSS Modules + variables CSS (design tokens)                   | Aucune dépendance, pas de bibliothèque de composants au rendu générique     |
| PWA               | `vite-plugin-pwa` (Workbox)                                   | Coquille hors ligne, cache des images                                       |
| Backend           | Supabase : Postgres, Auth, Storage, Edge Functions            | Gratuit à cette échelle, synchronisation entre deux téléphones, SQL lisible |
| OCR               | Tesseract.js, modèle `fra`, fichiers auto-hébergés avec l'app | Gratuit, tourne dans le navigateur, aucune image envoyée à un tiers         |
| Tests             | Vitest (logique métier), Playwright (2–3 parcours)            |                                                                             |
| Qualité           | ESLint + Prettier, CI GitHub Actions                          |                                                                             |
| Hébergement       | GitHub Pages, déployé par GitHub Actions                      | Gratuit, HTTPS (requis pour PWA et appareil photo)                          |

Contraintes connues à respecter :

- **Offre gratuite Supabase** : un projet inactif 7 jours est mis en pause. Ajouter un
  workflow GitHub planifié (2 fois par semaine) qui fait une requête de lecture. Documenter
  dans le README comment réactiver le projet à la main si besoin.
- **GitHub Pages gratuit suppose un dépôt public.** C'est acceptable : la clé publique
  Supabase est faite pour être exposée, la sécurité repose sur les règles RLS. Aucune clé
  `service_role` ni mot de passe dans le dépôt, jamais.
- **iOS** : une PWA installée a son propre stockage, distinct de Safari. Donc
  authentification par **e-mail + mot de passe** saisis dans l'app (pas de lien magique,
  qui s'ouvrirait dans Safari). Pour l'appareil photo, utiliser
  `<input type="file" accept="image/*" capture="environment">`, pas `getUserMedia`.
- GitHub Pages sert sous `/<nom-du-depot>/` : régler `base` dans Vite, le `scope` du
  manifeste, et copier `index.html` en `404.html` pour le routage.

## 3. Architecture du dépôt

```
/
├─ README.md               installation, variables d'env, déploiement, dépannage
├─ PLAN.md                 ce document
├─ docs/
│  ├─ architecture.md      schéma des flux, décisions et leurs raisons
│  └─ design.md            tokens, règles visuelles, captures des maquettes validées
├─ supabase/
│  ├─ migrations/          SQL versionné (schéma, RLS, buckets)
│  └─ functions/import-hellofresh/   Edge Function (Deno)
├─ scripts/
│  └─ import-json.ts       import en masse de fichiers JSON de recettes
├─ src/
│  ├─ domain/              logique pure, sans React ni réseau, 100 % testée
│  │  ├─ recipe.ts         types + schémas Zod
│  │  ├─ normalize.ts      normalisation des noms d'ingrédients
│  │  ├─ search.ts         recherche et filtres
│  │  ├─ pantryMatch.ts    score « Mon frigo »
│  │  └─ parseOcr.ts       texte OCR -> brouillon de recette
│  ├─ data/                accès Supabase (une fonction par opération) + hooks Query
│  ├─ features/            un dossier par écran : recipes, recipe-detail, pantry,
│  │                       add-recipe (scan, lien, manuel), settings, auth
│  ├─ ui/                  composants génériques : Button, StarRating, Sheet, TabBar…
│  ├─ styles/              tokens.css (clair/sombre), reset.css
│  └─ main.tsx, App.tsx, router.tsx
└─ .github/workflows/      ci.yml, deploy.yml, keepalive.yml
```

Règles de code : fichiers courts à responsabilité unique ; `domain/` ne dépend de rien ;
les composants n'appellent jamais Supabase directement (toujours via `data/`) ; commentaire
JSDoc sur chaque fonction exportée de `domain/` et `data/` expliquant le _pourquoi_ ; noms
de code en anglais, textes d'interface en français regroupés dans `src/strings.ts`.

## 4. Modèle de données (Postgres)

Les ingrédients et les étapes sont stockés en JSONB dans la recette : une recette est
toujours lue et modifiée en entier, et la recherche se fait côté client (quelques centaines
de recettes au plus, toutes chargées en mémoire). Cela évite les jointures et les
synchronisations partielles.

```
recipes
  id uuid pk, created_at, updated_at, created_by uuid
  title text not null, subtitle text, description text
  source text check in ('hellofresh','scan','manual')
  source_url text unique null, hellofresh_id text unique null
  prep_minutes int, total_minutes int, difficulty smallint (1-3), servings int
  tags text[]                       -- repris de HelloFresh, lecture seule
  allergens text[], utensils text[] -- repris de HelloFresh (ajout phase 1)
  ingredients jsonb not null        -- [{name, normalized, quantity|null, unit|null,
                                    --   shipped|null}]  shipped : ajout phase 1
  steps jsonb not null              -- [{text, image_path|null}]
  nutrition jsonb                   -- par portion : kcal, lipides, dont saturés,
                                    -- glucides, dont sucres, fibres, protéines, sel
  rating numeric(2,1) null          -- null = pas encore notée ; 0 à 5 par pas de 0,5
  comment text
  cover_photo_id uuid null

recipe_photos
  id uuid pk, recipe_id fk (cascade), path text, created_at, created_by
  kind text check in ('source','scan','user')   -- site, feuillet, photo perso

cook_log
  id uuid pk, recipe_id fk (cascade), cooked_on date, created_by, note text

pantry_items        -- contenu de « Mon frigo », partagé par le foyer
  normalized text pk, label text

pantry_staples      -- basiques considérés comme toujours disponibles
  normalized text pk, label text
```

- `pantry_staples` est pré-remplie : sel, poivre, huile d'olive, huile de tournesol,
  beurre, sucre, farine, vinaigre, eau. **Les œufs n'en font pas partie.** La liste est
  modifiable dans les réglages.
- **Sécurité** : les inscriptions sont désactivées dans Supabase ; les deux comptes sont
  créés à la main. RLS activé sur toutes les tables et sur le bucket privé `photos`, avec
  une seule règle : tout utilisateur authentifié peut tout lire et écrire. Aucune notion de
  foyer à modéliser.
- Conflits : le dernier enregistrement gagne. Recharger les données au retour au premier
  plan de l'app.
- Images : redimensionnées côté client avant envoi (grand côté 1600 px, WebP ou JPEG
  qualité ~80) et **copiées dans Supabase Storage**, y compris celles du site, pour ne pas
  dépendre de HelloFresh.

## 5. Fonctionnalités, écran par écran

Barre d'onglets flottante en Liquid Glass : **Recettes · Mon frigo · Réglages**, plus un
onglet **Recherche** séparé à droite. « Ajouter » est un bouton « + » sur l'écran Recettes
qui ouvre une feuille. Détails dans `docs/design.md`.

**Recettes (accueil)** — liste avec photo, titre, note, temps. Champ de recherche unique
(titre, sous-titre, ingrédients, tags ; insensible aux accents et à la casse). Tri : mieux
notées, récentes, plus rapides, cuisinées récemment. Filtres : note minimale, temps
maximal, tags, « jamais cuisinée », « non notée ».

**Fiche recette** — photo, titre, temps, difficulté ; note en demi-étoiles modifiable en
un geste ; commentaire ; ingrédients ; étapes ; valeurs nutritionnelles ; galerie (photos
du site, du feuillet, personnelles, avec choix de la photo de couverture) ; bouton « Cuisiné
aujourd'hui » et historique des dates ; lien vers la page d'origine ; modifier ; supprimer
(avec confirmation).

**Mon frigo** — saisie des ingrédients disponibles avec autocomplétion sur les ingrédients
connus. Résultat : recettes classées par score
`ingrédients possédés / ingrédients requis`, les basiques étant exclus du calcul. Chaque
ligne affiche « 6/8 » et la liste de ce qui manque. La correspondance utilise le nom
normalisé (minuscules, sans accents, singulier simple, sans quantités ni qualificatifs
comme « frais » ou « haché », plus une petite table de synonymes dans `normalize.ts`).

**Ajouter** — trois entrées :

1. _Depuis HelloFresh_ : coller un lien de recette `hellofresh.fr` → brouillon pré-rempli.
2. _Scanner un feuillet_ : une ou deux photos (recto/verso) → OCR sur l'appareil →
   brouillon. Si la phase 1 l'a validé, proposer d'abord « Retrouver cette recette sur
   HelloFresh » à partir du titre reconnu, ce qui donne un résultat bien plus propre que
   l'OCR complet. La photo du feuillet est conservée (`kind = 'scan'`).
3. _Saisie manuelle_.

Dans les trois cas on arrive sur le **même écran de relecture** (formulaire d'édition) avant
enregistrement. L'OCR gratuit fait des erreurs, surtout sur les mises en page en colonnes :
l'écran de relecture doit rendre la correction rapide (une ligne par ingrédient, un
paragraphe par étape, texte OCR brut consultable à côté). Détecter les doublons par
`source_url` ou titre identique.

**Réglages** — thème (Système / Clair / Sombre, « Système » par défaut), liste des basiques,
export de toutes les données en JSON, déconnexion, version de l'app.

**Hors ligne** — consultation des recettes déjà chargées (cache TanStack Query persisté en
IndexedDB, images en cache Workbox). Les modifications nécessitent une connexion : afficher
un bandeau discret et désactiver les actions d'écriture.

## 6. Direction de design

Références du propriétaire : **Yuka** (simplicité, lisibilité immédiate) et **Flighty**
(typographie précise, densité d'information maîtrisée, sombre soigné). Exigence explicite :
le résultat ne doit pas ressembler à une interface générée par IA.

À faire :

- police système (`-apple-system`, SF Pro sur iPhone), chiffres tabulaires pour temps,
  notes et valeurs nutritionnelles ; hiérarchie par la taille et la graisse, pas par la
  couleur ;
- une seule couleur d'accent, utilisée avec parcimonie ; fonds neutres ; sombre presque
  noir mais pas noir pur, avec niveaux de surface distincts ;
- les photos des plats portent l'identité visuelle ; le reste s'efface ;
- listes et séparateurs fins plutôt que cartes ombrées partout ; rayons modestes et
  constants ; grille d'espacement de 4 px ;
- cibles tactiles ≥ 44 px, zones sûres iOS (`env(safe-area-inset-*)`), contrastes AA,
  `prefers-reduced-motion` respecté ; animations courtes et utilitaires ;
- un seul jeu d'icônes en SVG, au trait homogène ; textes d'interface courts et concrets.

Liquid Glass (iOS 26/27) sur la couche de navigation uniquement, voir `docs/design.md`.

À proscrire : dégradés violets ou bleus, verre appliqué au contenu, emojis en guise
d'icônes, icônes « étincelles », ombres diffuses sur chaque bloc, gros rayons partout,
pastilles colorées décoratives, titres marketing, illustrations génériques, bibliothèque de
composants toute faite.

## 7. Phases d'exécution

### Phase 1 — Vérification de faisabilité HelloFresh (courte, sans code applicatif)

✅ **Faite le 12/11/2026.** Résultats, pièges et décisions dans `docs/architecture.md` :
import par lien via Edge Function retenu ; « Retrouver sur HelloFresh » réduit à l'ouverture
de la recherche du site dans Safari, puis lien collé à la main.

- Ouvrir 3 pages de recettes publiques de `www.hellofresh.fr` et relever quelles données
  structurées elles exposent (bloc JSON-LD `schema.org/Recipe`, données d'hydratation) :
  titre, ingrédients avec quantités, étapes, temps, nutrition, images, tags.
- Vérifier qu'une requête serveur simple (sans navigateur) obtient la même page.
- Vérifier s'il existe un moyen simple et public de retrouver une recette par son titre.
- Consigner le résultat dans `docs/architecture.md`.

Décision selon le résultat :

- données structurées accessibles côté serveur → import par lien via Edge Function ;
- accessibles seulement dans un navigateur → pas d'Edge Function ; l'import par lien est
  remplacé par l'import en masse de la phase 8, et l'ajout courant se fait par scan ;
- recherche par titre indisponible → retirer l'option « Retrouver sur HelloFresh » du scan.

_Acceptation_ : note écrite avec exemples réels et décision prise.

### Phase 2 — Maquettes ⛔

✅ **Validée par le propriétaire le 12/11/2026** (version 2 : navigation Liquid Glass
iOS 26/27). `mockups/index.html`, `src/styles/tokens.css`, `docs/design.md`.
Nom provisoire de l'app : « Popote ».

- Maquettes HTML/CSS statiques, format iPhone, clair et sombre, de : accueil, fiche recette,
  Mon frigo, Ajouter (les 3 entrées + relecture), Réglages. Contenu réaliste, pas de lorem.
- Écrire `src/styles/tokens.css` et `docs/design.md`.

_Acceptation_ : **validation explicite du propriétaire** avant toute suite.

### Phase 3 — Socle ⛔

🟡 **En cours.** Fait : projet, qualité, CI, migrations (validées sur Postgres embarqué),
connexion, garde de routes, PWA, workflows. Reste : appliquer la migration, configurer
GitHub Pages, tester la connexion réelle et l'installation sur iPhone.

- Initialiser le projet (Vite, React, TS strict, ESLint, Prettier, Vitest), l'arborescence
  du §3, la CI (lint, types, tests, build).
- ⛔ Le propriétaire crée le dépôt GitHub et le projet Supabase (région UE), désactive les
  inscriptions, crée les deux comptes, et fournit l'URL et la clé publique.
- Migrations SQL du §4, RLS, bucket `photos`, données initiales de `pantry_staples`.
- Authentification e-mail + mot de passe, session persistante, garde de routes.
- PWA : manifeste, icônes, service worker, `base` GitHub Pages ; workflows de déploiement
  et de keepalive.

_Acceptation_ : l'app déployée s'installe sur l'iPhone, on s'y connecte, la session survit
à la fermeture ; un utilisateur non connecté ne peut rien lire (tester la RLS).

### Phase 4 — Recettes : consulter, modifier, noter

- `domain/recipe.ts` (types + Zod), couche `data/`, liste, fiche, formulaire d'édition,
  suppression, note en demi-étoiles, commentaire, « Cuisiné aujourd'hui » et historique,
  nutrition, saisie manuelle.
- Photos : ajout depuis l'appareil ou la photothèque, redimensionnement, envoi, galerie,
  choix de la couverture, suppression.

_Acceptation_ : une recette créée ou notée sur un téléphone apparaît à l'identique sur
l'autre après retour au premier plan ; tests unitaires des schémas.

### Phase 5 — Recherche et Mon frigo

- `normalize.ts`, `search.ts`, `pantryMatch.ts` en logique pure, avec tests couvrant
  accents, pluriels, synonymes, basiques exclus, œufs **non** exclus.
- Interface de recherche, tris, filtres ; écran Mon frigo.

_Acceptation_ : recherche instantanée sur 300 recettes de test ; cas de test du score
écrits et verts.

### Phase 6 — Import par lien (selon décision de la phase 1)

- Edge Function `import-hellofresh` : exige un utilisateur authentifié ; n'accepte que des
  URL `https://www.hellofresh.fr/…` (refuser tout autre hôte) ; extrait les données
  structurées ; renvoie un brouillon validé par Zod. Erreurs explicites en français.
- Côté app : coller le lien → relecture → enregistrement, images copiées dans Storage,
  détection de doublon.

_Acceptation_ : 5 recettes réelles importées correctement ; test unitaire de l'extraction
sur des pages enregistrées en fixtures.

### Phase 7 — Scan du feuillet

- Tesseract.js chargé à la demande (jamais au démarrage), modèle `fra` servi par l'app et
  mis en cache ; prétraitement de l'image (redimensionnement, niveaux de gris, contraste) ;
  indicateur de progression ; annulation possible.
- `parseOcr.ts` : repérer titre, bloc ingrédients (lignes « quantité unité nom »), étapes
  numérotées ; tout ce qui n'est pas reconnu reste disponible dans le texte brut.
- Enchaînement vers « Retrouver sur HelloFresh » si disponible, sinon relecture.

_Acceptation_ : testé sur de vrais feuillets fournis par le propriétaire, sur iPhone ;
le temps de traitement et le taux de correction manuelle sont mesurés et rapportés tels
quels ; tests unitaires de `parseOcr.ts` sur des textes OCR réels.

### Phase 8 — Import de l'historique ⛔

- Définir le format d'échange : un fichier JSON par recette, conforme au schéma Zod.
- `scripts/import-json.ts` : valide, dédoublonne, envoie les images, insère. Utilise la
  clé `service_role` lue dans `.env.local` (non versionné). Mode `--dry-run`.
- ⛔ Le propriétaire se connecte lui-même à son compte HelloFresh dans le navigateur.
  L'agent parcourt ensuite les commandes passées à rythme modéré, ouvre chaque recette et
  produit les fichiers JSON. En cas de CAPTCHA ou de blocage : s'arrêter et le signaler.
- Lancer l'import, puis vérifier un échantillon avec le propriétaire.

_Acceptation_ : nombre de recettes importées = nombre trouvé dans l'historique ; liste
écrite des échecs éventuels ; aucun doublon.

### Phase 9 — Finitions

- Lecture hors ligne et bandeau « hors connexion » ; export JSON ; états vides, de
  chargement et d'erreur de tous les écrans.
- Passe d'accessibilité et de performance sur iPhone ; 2–3 parcours Playwright (connexion,
  recherche, notation).
- README complet : installation en local, variables d'environnement, migrations,
  déploiement, réactivation de Supabase, ajout d'un synonyme d'ingrédient, mise à jour des
  dépendances.

_Acceptation_ : CI verte ; un développeur qui découvre le dépôt lance l'app en local en
suivant uniquement le README.

## 8. Ce que le propriétaire doit fournir

- Phase 2 : son avis sur les maquettes.
- Phase 3 : dépôt GitHub, projet Supabase, deux comptes utilisateurs, URL et clé publique.
- Phase 7 : quelques photos de vrais feuillets pour les tests.
- Phase 8 : sa connexion à HelloFresh dans le navigateur, puis la clé `service_role` placée
  par lui-même dans `.env.local`.
