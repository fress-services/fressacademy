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
    settingsHint: 'Langue et thème',
    data: 'Vos données',
    dataHint: 'Où elles sont conservées et comment les protéger',
  },
  settings: {
    title: 'Paramètres',
    language: 'Langue de l’interface',
    theme: 'Thème',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    themeSystem: 'Comme l’appareil',
    saved: 'Préférence enregistrée.',
  },
  data: {
    title: 'Vos données',
    where:
      'Vos données restent dans ce navigateur, sur cet appareil. Kolo n’envoie pas vos montants à un serveur.',
    risk: 'Si vous effacez les données de ce navigateur ou perdez cet appareil, vos données seront perdues, sauf si vous en avez exporté une sauvegarde.',
    privacy:
      'Une personne qui a accès à cet appareil déverrouillé peut consulter ces données. Kolo n’est ni une banque ni un service chiffré.',
    protectionTitle: 'Protection contre l’effacement automatique',
    protectionGranted:
      'Activée : le navigateur ne supprimera pas ces données de lui-même pour libérer de la place.',
    protectionDenied:
      'Non activée : le navigateur pourrait effacer ces données s’il manque de place ou si Kolo n’est pas utilisé pendant longtemps.',
    protectionUnsupported:
      'Ce navigateur ne permet pas de protéger les données contre l’effacement.',
    protectionChecking: 'Vérification en cours…',
    protectionAction: 'Demander la protection',
    protectionRefused:
      'Le navigateur a refusé pour l’instant. Installer Kolo sur l’écran d’accueil peut aider.',
  },
  notFound: {
    title: 'Page introuvable',
    body: 'Cette page n’existe pas ou a été déplacée.',
    back: 'Revenir à l’accueil',
  },
  common: {
    back: 'Retour',
    loading: 'Chargement…',
    reload: 'Recharger la page',
  },
  errors: {
    startTitle: 'Kolo ne peut pas ouvrir vos données',
    unavailable:
      'Le stockage de ce navigateur n’est pas disponible (navigation privée ou stockage bloqué). Ouvrez Kolo dans une fenêtre normale ou dans un autre navigateur.',
    quotaExceeded:
      'L’espace de stockage de ce navigateur est plein. Libérez de la place puis rechargez la page.',
    newerVersion:
      'Vos données ont été enregistrées par une version plus récente de Kolo. Rechargez la page pour obtenir la dernière version. Vos données n’ont pas été modifiées.',
    notFound: 'L’élément demandé n’existe plus.',
    unknown:
      'Une erreur inattendue s’est produite. Rechargez la page. Vos données n’ont pas été modifiées.',
    saveFailed: 'L’enregistrement a échoué : {reason}',
  },
};

export type Messages = typeof fr;
