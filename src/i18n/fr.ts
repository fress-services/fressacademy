// Textes français : source de référence des clés de traduction.
// Toute clé ajoutée ici doit l'être aussi dans en.ts (TypeScript le vérifie).
export const fr = {
  app: {
    name: 'Kolo',
    tagline: 'Voir clair dans son argent.',
    pageTitle: '{page} · Kolo',
  },
  a11y: {
    skipToContent: 'Aller au contenu',
  },
  nav: {
    label: 'Navigation principale',
    home: 'Accueil',
    activity: 'Activité',
    budget: 'Budget',
    debts: 'Dettes',
    more: 'Plus',
  },
  home: {
    title: 'Accueil',
    emptyTitle: 'Bienvenue sur Kolo',
    emptyBody:
      'Ici apparaîtront vos soldes par devise, vos dépenses et revenus du mois, la marge de votre budget et vos prochaines échéances.',
    notice:
      'Kolo ne se connecte à aucune banque. Vous saisissez vous-même vos opérations et elles restent sur cet appareil.',
  },
  activity: {
    title: 'Activité',
    emptyTitle: 'Aucune opération pour l’instant',
    emptyBody:
      'Vos revenus, dépenses et transferts apparaîtront ici, du plus récent au plus ancien.',
  },
  budget: {
    title: 'Budget',
    emptyTitle: 'Aucune limite de dépenses',
    emptyBody:
      'Une limite mensuelle vous indiquera ce qu’il reste à dépenser ce mois-ci et combien cela représente par jour.',
  },
  debts: {
    title: 'Dettes',
    tabsLabel: 'Type de dette',
    receivable: 'À récupérer',
    payable: 'À rembourser',
    emptyReceivableTitle: 'Rien à récupérer',
    emptyReceivableBody: 'Les sommes que d’autres personnes vous doivent apparaîtront ici.',
    emptyPayableTitle: 'Rien à rembourser',
    emptyPayableBody: 'Les sommes que vous devez à d’autres personnes apparaîtront ici.',
  },
  more: {
    title: 'Plus',
    settings: 'Paramètres',
    settingsHint: 'Langue de l’interface',
    data: 'Vos données',
    dataHint: 'Où elles sont conservées et comment les protéger',
  },
  settings: {
    title: 'Paramètres',
    language: 'Langue de l’interface',
    themeNote: 'Le thème clair ou sombre suit pour l’instant le réglage de votre appareil.',
  },
  data: {
    title: 'Vos données',
    where:
      'Vos données restent dans ce navigateur, sur cet appareil. Kolo n’envoie pas vos montants à un serveur.',
    risk: 'Si vous effacez les données de ce navigateur ou perdez cet appareil, vos données seront perdues, sauf si vous en avez exporté une sauvegarde.',
    privacy:
      'Une personne qui a accès à cet appareil déverrouillé peut consulter ces données. Kolo n’est ni une banque ni un service chiffré.',
  },
  notFound: {
    title: 'Page introuvable',
    body: 'Cette page n’existe pas ou a été déplacée.',
    back: 'Revenir à l’accueil',
  },
  common: {
    back: 'Retour',
  },
};

export type Messages = typeof fr;
