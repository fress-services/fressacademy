# Kolo

> Voir clair dans son argent. Décider avec calme.

Kolo est une application web progressive (PWA) de finances personnelles, pensée pour le monde
entier : saisie manuelle, données conservées sur l'appareil, aucune connexion bancaire, aucun
compte obligatoire.

**État : lot 1 (socle de l'interface).** Le plan complet de la V1 est dans
[docs/PLAN_V1.md](docs/PLAN_V1.md).

## Ce qui existe aujourd'hui

- Navigation en 5 onglets : Accueil, Activité, Budget, Dettes, Plus (barre en bas sur téléphone,
  barre latérale sur grand écran).
- États vides explicatifs sur chaque onglet.
- Interface en français et en anglais (langue proposée selon le navigateur, modifiable dans
  Plus > Paramètres).
- Thème clair ou sombre selon le réglage de l'appareil.
- Page « Vos données » qui explique où sont conservées les données et leurs limites.

Aucune donnée n'est encore enregistrée : le stockage local arrive au lot 2.

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
  app/         démarrage, routes, mise en page et navigation
  components/  composants réutilisables (page, état vide, onglets, icônes)
  features/    un dossier par écran (dashboard, transactions, budget, debts, more, settings)
  i18n/        textes FR/EN et traduction
  styles/      design tokens et styles globaux
  test/        aides de test
tests/e2e/     scénarios Playwright
docs/          plan, décisions et limites connues
```

Règles : les calculs d'argent iront dans `src/domain/` (fonctions pures testées), l'accès aux
données dans `src/data/` ; les écrans ne lisent jamais la base directement.

## Documentation

- [docs/PLAN_V1.md](docs/PLAN_V1.md) : audit, architecture et plan par lots.
- [docs/DECISIONS.md](docs/DECISIONS.md) : décisions techniques et leurs raisons.
- [docs/LIMITES.md](docs/LIMITES.md) : limites connues.

## Ancien contenu du dépôt

L'ancien site « fressacademy » est conservé dans la branche `archive/ancien-site`.
