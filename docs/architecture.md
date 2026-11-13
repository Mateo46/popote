# Architecture et décisions

## Vue d'ensemble

```
iPhone (PWA installée)                         Supabase (UE)
┌──────────────────────────────┐   HTTPS   ┌──────────────────────────┐
│ React · React Router · Query │──────────▶│ Auth (e-mail + mot passe)│
│   features/ → data/ → client │           │ Postgres + RLS           │
│ Service worker (Workbox)     │           │ Storage « photos » privé │
└──────────────────────────────┘           └──────────────────────────┘
        ▲ fichiers statiques
GitHub Pages ◀── GitHub Actions (build à chaque push sur main)
```

- Les écrans (`src/features/`) ne parlent jamais à Supabase : ils passent par
  `src/data/` (règle ESLint). La logique pure (recherche, score) ira dans `src/domain/`.
- **Authentification** (`src/data/auth.ts`) : e-mail + mot de passe, session conservée
  dans le stockage de l'app (`persistSession`) et renouvelée automatiquement. L'état est
  un petit store lu avec `useSyncExternalStore`, alimenté par `onAuthStateChange`.
  `AppShell` protège toutes les routes sauf `/connexion` et mémorise la page demandée.
- **Configuration** (`src/config.ts`) : les variables `VITE_*` sont validées par Zod au
  démarrage ; en cas de problème, un écran explique quelle variable manque.
- **Sécurité** : RLS sur toutes les tables, une règle « tout membre connecté peut tout
  faire », aucun droit pour le rôle `anon`. Bucket de photos privé. Les inscriptions
  sont fermées dans Supabase.

## Choix de versions (phase 3, 12/11/2026)

Versions stables vérifiées sur npm et nodejs.org le jour de l'initialisation :

| Outil             | Version                     | Remarque                                         |
| ----------------- | --------------------------- | ------------------------------------------------ |
| Node.js           | 26 (LTS active « Lithium ») | `.nvmrc` ; 24 accepté en local (`engines`)       |
| React / React DOM | 19.3                        |                                                  |
| React Router      | 8.5 (mode « data »)         | `RouterProvider` s'importe de `react-router/dom` |
| Vite              | 8.3                         |                                                  |
| TypeScript        | **6.0**, pas 7.0            | `typescript-eslint` 8.72 exige TypeScript < 6.1  |
| Vitest            | 5.1                         |                                                  |
| ESLint            | 10 (flat config)            |                                                  |
| supabase-js       | 2.119                       |                                                  |
| Zod               | 4.6                         |                                                  |
| vite-plugin-pwa   | 2.0                         | icônes générées depuis `public/icon.svg`         |

## Données côté app (phase 4)

- **Une seule requête** (`['recipes']`, `src/data/hooks.ts`) charge toutes les recettes
  avec leurs photos et leur historique. La fiche lit dans ce cache, et la recherche ou
  « Mon frigo » le feront aussi. Le cache est rechargé au retour au premier plan, ce qui
  synchronise les deux téléphones.
- **Note, commentaire et couverture** : mise à jour optimiste (affichage immédiat, retour
  arrière si le serveur refuse).
- **Photos** : `<recette>/<photo>.jpg` (1600 px max) et `<recette>/<photo>.thumb.jpg`
  (400 px) dans le bucket privé `photos`, affichées via des URL signées valables 1 h.
  Supprimer une recette supprime d'abord ses fichiers, puis la ligne (cascade en base).
- **Formulaire** (`src/features/recipe-form/draft.ts`) : brouillon en texte, converti et
  validé à l'enregistrement. Il servira d'écran de relecture pour les imports.
- **Durée** : le formulaire n'a qu'un champ, enregistré dans `total_minutes`
  (`prep_minutes` est vidé). L'affichage prend toujours le maximum des deux.

## Recherche et « Mon frigo » (phase 5)

- **Clé d'ingrédient** (`src/domain/ingredients.ts`) : nom sans accents, au singulier,
  sans qualificatifs (« frais », « haché », « en poudre »…), avec une table de synonymes
  (« gousse d'ail » → « ail », « blanc de poulet » → « poulet »). Pour ajouter un
  synonyme : une ligne dans `synonyms`, plus un cas dans `ingredients.test.ts`.
- Les clés sont **recalculées à partir des libellés** à chaque utilisation : modifier ces
  règles ne demande aucune migration (la colonne `normalized` n'est qu'indicative).
- **Correspondance** : un ingrédient du frigo couvre celui de la recette si la clé est
  identique ou si celle de la recette commence par elle (« persil » couvre « persil
  plat »). Volontairement strict : « riz » ne couvre pas « nouilles de riz ».
- **Score** : possédés / requis, hors basiques. « Poivre et sel » est découpé en deux.
- **Recherche** : chaque mot doit commencer un mot du titre, du sous-titre, d'un
  ingrédient ou d'un tag. Les mots de chaque recette sont indexés une fois (cache
  `WeakMap`), d'où une recherche instantanée à chaque frappe.
- **Données** : `pantry_items` (frigo) et `pantry_staples` (basiques) sont communs au
  foyer. Les recherches récentes restent propres à chaque appareil (stockage local).

## Import par lien (phase 6)

```
App ──(lien, jeton de session)──▶ Edge Function import-hellofresh ──▶ www.hellofresh.fr
  ▲                                   │ extract.ts : __NEXT_DATA__, sinon JSON-LD
  └──────── { recipe } ◀──────────────┘
App : relecture (formulaire) → enregistrement → copie des images du CDN HelloFresh
      (CORS autorisé) vers le bucket « photos » : couverture (kind « source ») et étapes.
```

- **Pourquoi une fonction serveur** : le navigateur ne peut pas lire les pages
  hellofresh.fr (CORS). Les images, elles, sont lisibles directement (`img.hellofresh.com`
  répond `Access-Control-Allow-Origin: *`).
- **Sécurité** : la vérification automatique du jeton (`verify_jwt`) **laisse passer** un
  appel fait avec la seule clé publique (constaté le 12/11/2026 avec les nouvelles clés
  `sb_publishable_…`). La fonction vérifie donc elle-même la session auprès de
  `/auth/v1/user`. Toute nouvelle fonction doit faire de même.
- **Hôte verrouillé** : seules les adresses `https://www.hellofresh.fr/recipes/…` sont
  suivies, redirections comprises (pas de relais vers un autre site).
- **Doublons** : contrôlés avant l'import (identifiant dans le lien), puis après (la page
  finale peut être une autre recette), et en base (`hellofresh_id` et `source_url`
  uniques).
- **Échecs partiels** : une photo d'étape introuvable n'empêche pas l'enregistrement.
  L'étape reste sans photo.

## Scan des feuillets (phase 7, abandonné)

Construit puis retiré le 13/11/2026 à la demande du propriétaire : la lecture des
feuillets par OCR gratuit (Tesseract.js, sur l'appareil) était rapide mais pas assez
fiable. Le dernier état du code est dans l'historique git (commit `c60f0fe` : écran de
scan, `parseOcr.ts`, copie des fichiers OCR au build). La valeur `scan` reste autorisée en
base pour `recipes.source` et `recipe_photos.kind` (aucune migration utile).

## Import de l'historique (phase 8)

Fait une fois, le 13/11/2026, dans le navigateur intégré :

1. Le propriétaire se connecte lui-même à hellofresh.fr (jamais de mot de passe saisi par
   l'agent), page « Mes anciennes recettes », tout l'historique chargé via « Voir plus ».
2. Les adresses des recettes (`websiteURL`) sont lues dans les données déjà chargées par
   la page. L'API de HelloFresh exige un jeton : elle n'est pas appelée directement.
3. Chaque adresse passe par l'**import par lien** (Edge Function, puis `draftFromImport`,
   `draftToInput`, `createRecipe`, copie des photos), exécuté dans l'app connectée. On
   réutilise exactement le code testé, sans clé `service_role`.
4. Dédoublonnage sur l'identifiant HelloFresh canonique et sur le titre normalisé, avec
   2 s de pause entre deux recettes.

Constats :

- Les anciens identifiants redirigent vers la version **actuelle** de la recette, dont le
  titre ou un ingrédient peut différer de la box livrée (« aiguillettes de poulet »
  devenues « de dinde », « porc » devenu « poulet »…).
- Certaines recettes récentes n'ont **aucune photo** chez HelloFresh (`imagePath` vide) :
  elles sont importées sans photo.
- Pour un nouvel import en masse, le même procédé s'applique. Un échec ou une page
  anti-robot doit arrêter la boucle (le code de la phase 8 le faisait sur « captcha »,
  « robot » ou « 429 »).

## Écarts au plan initial

- `recipes.difficulty` est un `smallint` (1 à 3) et non un texte : c'est le format de
  HelloFresh. L'interface affiche « Facile / Moyen / Difficile ».
- Ajout de `allergens`, `utensils` et `ingredients[].shipped` (décidé en phase 1).
- Le dépôt GitHub est public (condition de GitHub Pages gratuit) : les photos HelloFresh
  des maquettes ne sont pas versionnées (`.gitignore`).

## Phase 1 : faisabilité de l'import HelloFresh (vérifiée le 12/11/2026)

### Méthode

- Requêtes HTTP simples (`curl`, sans navigateur ni JavaScript) sur `https://www.hellofresh.fr`.
- Trois recettes publiques analysées :
  - `bavette-et-beurre-aux-fines-herbes-5d53de8f162d6f000d5dac5a` (recette de 2019) ;
  - `bo-bun-vietnamien-au-boeuf-saute-678a771300ea0a08f0b229c7` (2025) ;
  - `aubergine-laquee-au-miso-and-oeuf-64fb2da9786cce2df0e01899` (2023, végétarienne).
- Recherche par titre testée dans le navigateur intégré, `robots.txt` consulté.

### Résultats

**1. Une requête serveur simple suffit.** Les trois pages répondent en `200` à un `GET` sans
cookie ni JavaScript. Aucune protection anti-robot n'a été rencontrée sur ces quelques
requêtes. `robots.txt` autorise `/recipes/<slug>` et interdit seulement `/recipes/search/?q*`
et `/my-account` aux robots.

**2. Deux sources de données structurées dans chaque page :**

| Donnée                           | JSON-LD `schema.org/Recipe`        | `__NEXT_DATA__` (`props.pageProps.ssrPayload.recipe`)                                                   |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Titre / sous-titre               | `name` (titre + sous-titre collés) | `name`, `headline` séparés                                                                              |
| Description                      | oui                                | `description`, `descriptionMarkdown`                                                                    |
| Ingrédients                      | chaînes « 400 g Grenailles »       | `ingredients[]` (id, nom, image, `shipped`) + `yields[]` (quantité et unité par id, de 1 à 6 personnes) |
| Étapes                           | `HowToStep.text` (parfois en HTML) | `steps[]` : `instructionsMarkdown`, `images[].path`                                                     |
| Temps                            | `totalTime`                        | `prepTime`, `totalTime` (incohérents, voir plus bas)                                                    |
| Difficulté                       | non                                | `difficulty` (1 à 3)                                                                                    |
| Tags                             | non                                | `tags[].name`, `cuisines[].name`                                                                        |
| Allergènes, ustensiles           | non                                | `allergens[]`, `utensils[]`                                                                             |
| Nutrition par portion            | oui, en texte (« 941 kcal »)       | `nutrition[]` : nom, valeur numérique, unité                                                            |
| Photo principale                 | URL complète                       | `imagePath`                                                                                             |
| Ingrédients « à avoir chez soi » | mélangés aux autres                | `shipped: false` (sel, poivre, huile, beurre, œuf…)                                                     |
| Fiche PDF imprimable             | non                                | `cardLink`, seulement sur les recettes anciennes                                                        |

Exemple réel (bavette, 2 personnes) : 15 ingrédients, 6 étapes avec photo, difficulté 2,
941 kcal, tags « À faire rapidement », 6 ingrédients non livrés dont « Poivre et sel ».

**3. Images téléchargeables directement**, sans authentification :

- photo principale : `https://img.hellofresh.com/w_1600,q_auto,f_auto/hellofresh_s3/image/<fichier>`
  (environ 500 Ko ; sans paramètre de taille, l'original fait plus de 2 Mo) ;
- photo d'étape : `https://img.hellofresh.com/hellofresh_s3/<recipeId>/step-<hash>.jpg`.

**4. La recherche par titre n'est pas exploitable côté serveur.** La page
`/recipes/search?q=bavette` renvoie un HTML sans résultats : la liste est chargée ensuite
par JavaScript, via une API privée qui demande un jeton. Dans un navigateur, la recherche
fonctionne normalement. `robots.txt` interdit aussi cette page aux robots.

### Pièges relevés (à gérer dans l'extracteur)

- **Une même recette a plusieurs identifiants.** HelloFresh republie les recettes chaque
  semaine sous un nouvel id, et l'ancienne URL redirige (`301`) vers l'URL canonique.
  Exemple constaté : `bo-bun-vietnamien-au-poulet-saute-6a5de242…` redirige vers
  `bo-bun-vietnamien-au-boeuf-saute-678a7713…`, un **autre** titre. Il faut toujours suivre
  les redirections, puis enregistrer `websiteUrl` et l'id **de la page finale**. On
  dédoublonne sur cet id canonique, et l'écran de relecture montre ce qui a été réellement
  récupéré.
- **Les temps sont incohérents** : pour la bavette `prepTime = PT35M`, `totalTime = PT0S` ;
  pour le bò bún `prepTime = PT45M` > `totalTime = PT35M`. Règle retenue : durée affichée =
  `max(prepTime, totalTime)`, à corriger si besoin à la relecture.
- **Le texte des étapes contient du HTML** (`<ul><li>`, entités `&#39;`). Utiliser
  `instructionsMarkdown`, le convertir en texte brut, et retirer la phrase standard
  « Veillez à bien respecter les quantités indiquées… ».
- **Les quantités sont données pour 1 à 6 personnes.** Prendre l'entrée `yields`
  correspondant à 2 personnes (taille de box du foyer), sinon la plus petite.
- **« Poivre et sel » est un seul ingrédient.** La normalisation doit le découper ou
  l'ajouter aux basiques.
- **Le champ « sodium » du JSON-LD contient en réalité le sel** (6,1 g pour le bò bún).
  Lire la nutrition depuis `__NEXT_DATA__`, où l'intitulé « Sel » est explicite.
- **Dépendance à la structure du site** : `__NEXT_DATA__` est un détail d'implémentation de
  HelloFresh et peut changer sans préavis. L'extracteur essaie `__NEXT_DATA__` en premier,
  se replie sur le JSON-LD (plus stable, mais sans difficulté, tags ni photos d'étapes), et
  renvoie une erreur claire si aucun des deux n'est trouvé.

### Décisions

1. **Import par lien via Edge Function : retenu.** L'Edge Function `import-hellofresh`
   télécharge la page (en suivant les redirections, hôte `www.hellofresh.fr` uniquement),
   extrait les données (`__NEXT_DATA__`, puis JSON-LD en repli) et renvoie un brouillon
   validé par Zod. Une seule requête par import, déclenchée par l'utilisateur.
2. _(Caduc depuis l'abandon du scan en phase 7.)_ **« Retrouver cette recette sur HelloFresh » après un scan : retenu sous forme
   simplifiée.** Pas de recherche automatique (API privée, interdite aux robots). L'app
   ouvre dans Safari `https://www.hellofresh.fr/recipes/search?q=<titre reconnu>` ;
   l'utilisateur choisit la bonne recette, copie le lien et le colle dans l'app (bouton
   « Coller le lien »). L'OCR complet reste disponible si la recette n'est pas trouvée.
3. **Import de l'historique (phase 8)** : il suffira de relever, depuis le compte connecté,
   la liste des URL de recettes des commandes passées, puis de passer chaque URL dans le
   même extracteur que l'import par lien. Pas besoin d'extraire le contenu des pages du
   compte. Rythme : une recette toutes les 2–3 secondes environ.
4. **Données à ajouter au modèle** par rapport au plan initial :
   - `hellofresh_id` = id canonique sans suffixe de langue (par ex. `678a771300ea0a08f0b229c7`) ;
   - `allergens text[]` et `utensils text[]`, gratuits à récupérer et utiles en cuisine ;
   - `shipped boolean` sur chaque ingrédient, qui sert d'indice pour la liste des basiques
     de « Mon frigo » (sans la remplacer : les œufs sont `shipped: false` mais doivent
     compter) ;
   - `nutrition` stockée par portion avec valeurs numériques.
5. **Fixtures de test** : pour la phase 6, enregistrer dans
   `supabase/functions/import-hellofresh/fixtures/` le seul contenu de `__NEXT_DATA__` et du
   JSON-LD des trois recettes ci-dessus (quelques dizaines de Ko), pas les pages entières
   (1,7 Mo chacune).
