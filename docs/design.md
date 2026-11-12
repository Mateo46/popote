# Design

Références choisies par le propriétaire : **Yuka** (simplicité, lecture immédiate) et
**Flighty** (typographie précise, chiffres mis en avant, sombre soigné). Exigence : le
résultat ne doit pas ressembler à une interface générée par IA.

- Tokens (source de vérité) : `src/styles/tokens.css`.
- Maquettes de référence : `mockups/index.html`, avec les photos dans `mockups/img/`.
  Servir le dossier pour les voir (`python3 -m http.server --directory mockups`). Ce sont
  des maquettes statiques : elles contiennent une copie des tokens, à ne pas modifier
  séparément.

## Principes

1. **La photo du plat porte l'identité.** L'interface autour reste neutre : fonds gris
   très légèrement verts, texte presque noir ou presque blanc, une seule couleur d'accent.
2. **Hiérarchie par la taille et la graisse**, pas par la couleur. Les chiffres (temps,
   note, calories, score « Mon frigo ») sont en police arrondie et en chiffres tabulaires,
   comme les durées de vol dans Flighty.
3. **Listes iOS plutôt que cartes.** Lignes séparées par des filets fins (0,5 px), groupes
   à rayon de 12 px. Pas d'ombre portée sur les blocs de contenu.
4. **Une seule action principale par écran**, en pilule pleine couleur d'accent
   (« Cuisinée aujourd'hui », « Importer la recette »). Les actions secondaires utilisent
   le fond d'accent atténué.
5. **Textes courts et concrets** : « Manque : piment, paprika fumé », « Il y a 12 j ».
   Pas de titres marketing ni de phrases d'accueil.

## Navigation et Liquid Glass (iOS 26 / 27)

Demande du propriétaire : suivre les recommandations iOS les plus récentes, notamment le
Liquid Glass de la barre d'onglets. Sources consultées le 12/11/2026 : Human Interface
Guidelines d'Apple, page « Tab bars » (mise à jour le 8 juin 2026), et la présentation des
changements d'iOS 27 par MacRumors (10 juin 2026).

**Structure**

- Barre d'onglets **flottante**, en capsule, au-dessus du contenu : **Recettes · Mon
  frigo · Réglages**. Libellés d'un ou deux mots, icône pleine pour l'onglet actif.
- **Onglet Recherche séparé**, rond, à droite de la barre, comme le recommandent les HIG.
  Une fois touché, la barre se réduit à l'onglet courant (petit rond à gauche) et le champ
  de recherche s'affiche en bas de l'écran, près du pouce. Les filtres sont des puces en
  haut de l'écran de recherche.
- **« Ajouter » n'est pas un onglet** : les HIG réservent la barre d'onglets à la
  navigation, pas aux actions. C'est un bouton « + » en verre en haut de l'écran Recettes,
  qui ouvre une **feuille flottante** (marges de 8 px, rayon de 40 px, concentrique avec
  les coins de l'écran).
- La barre d'onglets reste visible sur la fiche recette ; seule une feuille la recouvre.
- Barres d'outils (fiche, vérification d'un scan) : boutons ronds de 44 px en verre posés
  sur le contenu, sans barre pleine. Le bouton de validation est teinté avec l'accent.

**Règle d'usage** : le verre est réservé à la **couche de navigation** (barre d'onglets,
onglet Recherche, boutons flottants, feuilles). Il n'est **jamais appliqué au contenu**
(lignes, groupes, cartes, champs du formulaire). Le contenu défile dessous.

**Rendu** (`.glass`) : fond translucide `--glass-bg`, `backdrop-filter: blur(16px)
saturate(180%)`, reflet spéculaire en haut (`--glass-highlight`), **bord assombri** de
0,5 px (`--glass-edge`, nouveauté iOS 27) et ombre douce. Onglet actif : pastille
`--glass-selected` et couleur d'accent.

**Fondu haut** (iOS 27) : un dégradé `--edge-fade` sous la barre d'état garde le texte
lisible quand le contenu défile dessous.

**Accessibilité** : avec « Réduire la transparence » (`prefers-reduced-transparency`) ou
« Augmenter le contraste » (`prefers-contrast: more`), le verre devient une surface opaque
et le bord se renforce. Les tokens s'en chargent ; aucun composant ne doit le refaire.

**Limites d'une PWA** : le vrai Liquid Glass (réfraction, déformation au toucher, curseur
de transparence d'iOS 27) est réservé aux apps natives. On l'approche en CSS. Le flou
coûte en performance : maximum 3 ou 4 éléments en verre à l'écran.

## Couleurs

| Token                                                                      | Rôle                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `--color-bg`                                                               | fond d'écran (derrière les groupes)                          |
| `--color-surface`                                                          | lignes, barres d'onglets, feuilles                           |
| `--color-fill`                                                             | champs, puces, contrôle segmenté, encadré du commentaire     |
| `--color-separator`                                                        | filets                                                       |
| `--color-text`, `-secondary`, `-tertiary`                                  | trois niveaux de texte, pas plus                             |
| `--color-accent` (« basilic »), `--color-accent-soft`, `--color-on-accent` | actions, onglet actif, puces « Mon frigo », numéros d'étapes |
| `--color-star`, `--color-star-empty`                                       | étoiles uniquement                                           |
| `--color-warning`, `--color-warning-soft`                                  | lignes OCR à vérifier uniquement                             |
| `--color-danger`                                                           | « Se déconnecter », « Supprimer »                            |
| `--color-overlay`                                                          | repli opaque du verre                                        |
| `--color-scrim`                                                            | voile derrière une feuille                                   |
| `--glass-*`, `--edge-fade`                                                 | Liquid Glass, voir plus haut                                 |

L'accent n'est pas le vert citron de HelloFresh : l'app ne doit pas imiter leur marque.

## Typographie

Police système (SF Pro sur iPhone), aucune police web à charger. Échelle :

| Token                | Taille                     | Usage                                      |
| -------------------- | -------------------------- | ------------------------------------------ |
| `--text-large-title` | 34 px gras                 | titre d'onglet (Recettes, Mon frigo…)      |
| `--text-title`       | 22 px gras                 | titre de la fiche recette                  |
| `--text-headline`    | 17 px demi-gras            | titres de ligne, barre de navigation       |
| `--text-body`        | 17 px                      | saisie, recherche                          |
| `--text-subhead`     | 15 px                      | texte courant, étapes                      |
| `--text-footnote`    | 13 px                      | métadonnées, notes sous les groupes        |
| `--text-caption`     | 11 px, capitales espacées  | intitulés de section, libellés de chiffres |
| `--text-stat`        | 20 px arrondie demi-grasse | chiffres clés                              |

## Espacements et formes

- Grille de 4 px (`--space-1` à `--space-8`). Marge latérale des écrans : 16 px.
- Rayons : 8 px (vignettes, champs, puces), 12 px (groupes, photos), cercle (boutons
  sur photo, pilules). Aucune autre valeur.
- Cibles tactiles d'au moins 44 px. Barre d'onglets et en-têtes respectent les zones
  sûres iOS (`env(safe-area-inset-*)`).

## Composants

- **Ligne de recette** : vignette 64 px, titre sur deux lignes au plus, sous-titre sur
  une ligne, puis « ★ 4,5 · 35 min · Il y a 12 j ». Recette non notée : « Non notée » en
  texte tertiaire.
- **Note** : 5 étoiles de 36 px ; toucher la moitié gauche d'une étoile donne x,5 ;
  toucher la note actuelle l'efface. Au clavier : flèches ±0,5. Rôle ARIA `slider`.
  Affichage décimal à la française (4,5).
- **Chiffres clés de la fiche** : 4 colonnes séparées par des filets verticaux (durée,
  difficulté en toutes lettres « Facile / Moyen / Difficile », kcal, personnes).
- **Ingrédients** : deux groupes, « Ingrédients » (livrés) et « À avoir chez soi »
  (`shipped: false`), quantités alignées à droite.
- **Score « Mon frigo »** : « 6/8 » et barre fine de 48 px ; ligne « Manque : … » limitée
  à 3 noms puis « +N ».
- **Ligne OCR à vérifier** : fond `--color-warning-soft`, caractère suspect souligné,
  étiquette « À vérifier ».

## Mouvement

Animations courtes (`--duration`, 160 ms) et seulement utilitaires : apparition d'une
feuille, changement d'état d'un bouton. Désactivées si `prefers-reduced-motion`.

## À proscrire

Dégradés violets ou bleus, verre sur le contenu (il est réservé à la navigation), emojis en guise d'icônes, icônes
« étincelles », ombres diffuses sur chaque bloc, grands rayons partout, pastilles
décoratives, illustrations génériques, bibliothèque de composants toute faite.
Icônes : un seul jeu SVG au trait de 1,75 px, extrémités arrondies.
