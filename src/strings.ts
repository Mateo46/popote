/**
 * Textes de l'interface, regroupés ici pour garder un ton homogène et les retrouver vite.
 * Règles d'écriture : phrases courtes et concrètes, vouvoiement, pas de titres marketing.
 */
const appName = 'Popote';

export const strings = {
  appName,

  tabs: {
    recipes: 'Recettes',
    pantry: 'Mon frigo',
    settings: 'Réglages',
    search: 'Rechercher',
  },

  auth: {
    title: 'Connexion',
    intro: 'Connectez-vous avec le compte créé pour votre foyer.',
    email: 'E-mail',
    password: 'Mot de passe',
    submit: 'Se connecter',
    submitting: 'Connexion…',
    invalidCredentials: 'E-mail ou mot de passe incorrect.',
    offline: 'Pas de connexion internet. Réessayez une fois en ligne.',
    unknownError: 'La connexion a échoué. Réessayez dans un instant.',
    noAccount: 'Les comptes sont créés dans Supabase : il n’y a pas d’inscription dans l’app.',
  },

  recipes: {
    title: 'Recettes',
    emptyTitle: 'Aucune recette',
    emptyBody: 'Les recettes ajoutées par le foyer apparaîtront ici.',
  },

  pantry: {
    title: 'Mon frigo',
    subtitle: 'Ce que vous avez sous la main',
    emptyBody: 'Indiquez vos ingrédients pour voir les recettes qui vous correspondent.',
  },

  search: {
    title: 'Rechercher',
    emptyBody: 'Cherchez par titre, ingrédient ou tag.',
  },

  settings: {
    title: 'Réglages',
    appearance: 'Apparence',
    themeSystem: 'Système',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    account: 'Compte',
    signOut: 'Se déconnecter',
    version: (version: string) => `${appName} · version ${version}`,
  },

  config: {
    title: 'Configuration incomplète',
    body: 'L’application ne connaît pas son serveur Supabase. Vérifiez les variables décrites dans .env.example, puis relancez le build.',
  },

  notFound: {
    title: 'Page introuvable',
    back: 'Retour aux recettes',
  },
} as const;
