# Kolo

> Voir clair dans son argent. Décider avec calme.

Kolo est une application web progressive (PWA) de finances personnelles, pensée pour le monde
entier : saisie manuelle, données conservées sur l'appareil, aucune connexion bancaire, aucun
compte obligatoire.

**État : lot 5 (dettes, dépenses prévues, objectifs) terminé.** Le plan complet de la V1 est dans
[docs/PLAN_V1.md](docs/PLAN_V1.md).

## Ce qui existe aujourd'hui

- Navigation en 5 onglets : Accueil, Activité, Budget, Dettes, Plus (barre en bas sur téléphone,
  barre latérale sur grand écran).
- États vides explicatifs sur chaque onglet.
- Interface en français et en anglais (langue proposée selon le navigateur, modifiable dans
  Plus > Paramètres).
- Style « sombre vert premium » (thème sombre par défaut), thème clair ou « comme l'appareil »
  au choix dans Plus > Paramètres.
- Langue et thème mémorisés sur l'appareil (base locale IndexedDB).
- Page « Vos données » : où sont conservées les données, leurs limites, et demande de protection
  contre l'effacement automatique par le navigateur.
- Premier lancement guidé : langue, devise principale (suggérée d'après le navigateur), premier
  compte et limite mensuelle de dépenses facultatifs.
- Comptes (Plus > Comptes) : création, modification, solde initial, ajustement de solde par une
  opération datée, archivage, suppression d'un compte inutilisé. Devise verrouillée dès qu'une
  opération utilise le compte.
- Catégories (Plus > Catégories) : 16 catégories fournies, catégories personnelles à créer,
  renommer et archiver.
- Opérations : dépense, revenu, transfert entre comptes de même devise ; ajout, modification,
  suppression ; liste « Activité » groupée par date.
- Accueil : soldes par compte et par devise (jamais additionnés entre devises), ajout rapide,
  résumé du budget, revenus et dépenses du mois avec accès aux mois précédents.
- Budget : limite mensuelle reconduite chaque mois, dépensé, reste, montant par jour jusqu'à la
  fin du mois (aujourd'hui inclus), dépassement affiché clairement.
- Modèle de données complet de la V1 avec calculs d'argent exacts, catalogue des devises
  ISO 4217 et dates locales.
- Dettes (onglet Dettes) : à récupérer ou à rembourser, remboursements partiels, statut et
  « en retard » calculés, mouvement d'argent enregistrable dans un compte sans compter comme
  revenu, dépense ni budget.
- Dépenses prévues (Plus) : à venir par échéance, « Marquer comme payée » qui crée une seule
  dépense réelle, même en cas de double appui.
- Objectifs d'épargne (Plus) : progression saisie à la main, sans effet sur les soldes.
- Accueil : bloc « À venir » avec les prochaines dépenses prévues et les dettes ouvertes.

## Prérequis

- [Node.js](https://nodejs.org/) 20.19 ou plus récent (version 22 recommandée, voir `.nvmrc`).

## Commandes

```bash
npm install                        # installer les dépendances (une fois)
npm run dev                        # lancer en local : http://localhost:5173
npm test                           # tests métier et interface (Vitest)
npx playwright install chromium    # une seule fois, avant les tests de bout en bout
npm run test:e2e                   # parcours de bout en bout, profils mobile et ordinateur
npm run lint                       # règles de code (ESLint, accessibilité incluse)
npm run typecheck                  # vérification TypeScript
npm run format                     # mise en forme automatique (Prettier)
npm run build                      # version de production dans dist/
npm run preview                    # servir la version de production localement
npm run check                      # tout vérifier d'un coup (lint, types, tests, build, e2e)
```

Dans l'environnement cloud de Claude Code, Chromium est déjà installé : lancer les tests de bout
en bout avec `KOLO_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`.

## Organisation du code

```
src/
  app/         démarrage, ouverture des données, routes, mise en page et navigation
  components/  composants réutilisables (page, champs de formulaire, boutons, cartes, messages)
  domain/      types et règles métier purs : argent, devises, dates (aucun accès navigateur)
  data/        contrats des repositories, base locale Dexie, migrations, erreurs de stockage
  services/    opérations métier (comptes, catégories, opérations, premier lancement)
  features/    un dossier par écran (onboarding, dashboard, accounts, categories, transactions…)
  i18n/        textes FR/EN et traduction
  styles/      design tokens et styles globaux
  test/        aides de test
tests/e2e/     scénarios Playwright
docs/          plan, décisions et limites connues
```

Règles : les calculs d'argent vont dans `src/domain/` (fonctions pures testées), l'accès aux
données dans `src/data/`, les règles d'écriture (validation, verrous) dans `src/services/` ; les
écrans ne lisent jamais la base directement. Les montants sont
des entiers en unités mineures (12,50 EUR = 1250), jamais des nombres à virgule.

Changer le schéma de la base : voir le commentaire en tête de `src/data/local/db.ts`.

## Documentation

- [docs/PLAN_V1.md](docs/PLAN_V1.md) : audit, architecture et plan par lots.
- [docs/DECISIONS.md](docs/DECISIONS.md) : décisions techniques et leurs raisons.
- [docs/LIMITES.md](docs/LIMITES.md) : limites connues.

## Ancien contenu du dépôt

L'ancien site « fressacademy » est conservé dans la branche `archive/ancien-site`.
