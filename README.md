# Kolo

> Voir clair dans son argent. Décider avec calme.

Kolo est une application web progressive (PWA) de finances personnelles, pensée pour le monde
entier : saisie manuelle, données conservées sur l'appareil, aucune connexion bancaire, aucun
compte obligatoire.

**État : V1 terminée (version 1.0.0, lot 8 : revue finale).** Rapport des tests, limites et
guide de lancement : [docs/RAPPORT_V1.md](docs/RAPPORT_V1.md). Le plan de la V1 est dans
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
- Recherche (sans accent ni majuscule) dans l'activité et les dettes ; filtres par type, compte,
  catégorie, devise et période, gardés dans l'adresse de la page.
- Rapports (Plus) : revenus, dépenses réelles, différence, dépenses par catégorie et
  comparaison avec le mois précédent, par devise.
- Sauvegarde et export (Plus, et lien dans Paramètres) : CSV des opérations, sauvegarde JSON
  complète, restauration vérifiée avec aperçu et confirmation, effacement de toutes les données.
  Au premier lancement, « J'ai déjà une sauvegarde Kolo » récupère les données d'un autre appareil.

- Application installable (manifeste, icônes) et utilisable hors ligne après le premier
  chargement : un service worker garde les fichiers de l'application, les données restent dans
  IndexedDB. Une nouvelle version s'annonce par un bandeau « Recharger », sans recharger seule.
- Audit d'accessibilité automatique (axe, WCAG 2.2 A/AA) sur toutes les pages, thèmes sombre et
  clair.

## Installer Kolo sur un téléphone

Une fois Kolo en ligne (voir « Mise en ligne »), ouvrir son adresse dans le navigateur du
téléphone, puis :

- Android (Chrome) : menu ⋮ > « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- iPhone (Safari) : bouton Partager > « Sur l'écran d'accueil ».

Après la première ouverture, Kolo fonctionne sans Internet.

## Mise en ligne (GitHub Pages)

Le fichier `.github/workflows/deploy.yml` publie l'application à chaque fusion dans `main`
(ou à la demande, onglet Actions > « Publier sur GitHub Pages »). Seuls les fichiers de
l'application sont publiés, jamais de données.

1. Une seule fois : sur GitHub, Settings > Pages > Source : « GitHub Actions ».
2. Fusionner dans `main` : l'adresse est `https://<compte>.github.io/<dépôt>/`.

Renommer le dépôt change l'adresse : les données déjà saisies restent liées à l'ancienne
adresse dans le navigateur. Faire une sauvegarde avant, puis la restaurer à la nouvelle adresse.

Pour tester localement sous un sous-chemin : `KOLO_BASE=/fressacademy/ npm run build` puis
`KOLO_BASE=/fressacademy/ npm run preview`.

## Sauvegarder et restaurer ses données

1. Plus > Sauvegarde et export > « Télécharger une sauvegarde » : un fichier
   `kolo-sauvegarde-AAAA-MM-JJ.json`. Il contient vos données en clair : gardez-le en lieu privé.
2. Sur le nouvel appareil (ou après un effacement), au premier lancement : « J'ai déjà une
   sauvegarde Kolo », choisir le fichier, vérifier l'aperçu, puis « Restaurer ce fichier ».
3. Sur un appareil déjà utilisé, la restauration **remplace** toutes les données (pas de fusion) :
   Kolo propose d'abord une sauvegarde de secours et demande une confirmation.

Un fichier abîmé, étranger, incohérent, trop gros (plus de 20 Mo) ou venant d'une version plus récente de
Kolo est refusé sans rien modifier.

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
npm run icons                      # régénérer les icônes PNG depuis public/*.svg (Chromium)
```

Dans l'environnement cloud de Claude Code, Chromium est déjà installé : lancer les tests de bout
en bout avec `KOLO_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e` (même variable pour
`npm run icons`).

Le service worker n'est actif que dans la version de production (`npm run build` puis
`npm run preview`), pas avec `npm run dev`.

## Organisation du code

```
src/
  app/         démarrage, ouverture des données, routes, mise en page et navigation
  components/  composants réutilisables (page, champs de formulaire, boutons, cartes, messages)
  domain/      types et règles métier purs : argent, devises, dates (aucun accès navigateur)
  data/        contrats des repositories, base locale Dexie, migrations, erreurs de stockage,
               format CSV et sauvegarde JSON (data/backup)
  services/    opérations métier (comptes, catégories, opérations, dettes, sauvegarde…)
  features/    un dossier par écran (onboarding, dashboard, accounts, categories, transactions…)
  i18n/        textes FR/EN et traduction
  styles/      design tokens et styles globaux
  test/        aides de test
tests/e2e/     scénarios Playwright
docs/          plan, décisions, limites, rapport final et test manuel
```

Règles : les calculs d'argent vont dans `src/domain/` (fonctions pures testées), l'accès aux
données dans `src/data/`, les règles d'écriture (validation, verrous) dans `src/services/` ; les
écrans ne lisent jamais la base directement. Les montants sont
des entiers en unités mineures (12,50 EUR = 1250), jamais des nombres à virgule.

Changer le schéma de la base : voir le commentaire en tête de `src/data/local/db.ts`.

## Documentation

- [docs/RAPPORT_V1.md](docs/RAPPORT_V1.md) : rapport final des tests et guide de lancement.
- [docs/TEST_MANUEL.md](docs/TEST_MANUEL.md) : liste à cocher sur téléphone et ordinateur.
- [docs/PLAN_V1.md](docs/PLAN_V1.md) : audit, architecture et plan par lots.
- [docs/DECISIONS.md](docs/DECISIONS.md) : décisions techniques et leurs raisons.
- [docs/LIMITES.md](docs/LIMITES.md) : limites connues.

## Ancien contenu du dépôt

L'ancien site « fressacademy » est conservé dans la branche `archive/ancien-site`.
