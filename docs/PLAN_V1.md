# Kolo V1 : audit et plan d'implémentation

Date : 19 octobre 2026. Référence : `Docs/Kolo_Cahier_des_charges_V1_et_Roadmap.docx` (v1.0, abrégé « CDC »).
Statut : **en attente de validation. Aucun code écrit.**

---

## 1. Audit de l'existant

### 1.1 Dépôt

- Dépôts GitHub accessibles depuis ce projet : `fress-services/DOTFY_V1` et `fress-services/fressacademy`. **Aucun dépôt Kolo.**
- Dossier partagé du projet : seul `FrozenFrontline/` existe (jeu Unity, en pause, non touché).
- Conclusion : **le dépôt Kolo est vide.** Il n'y a ni fichiers, ni dépendances, ni scripts, ni tests, ni configuration, ni fonctionnalités existantes. Aucun risque de régression sur un existant.

### 1.2 Environnement de travail vérifié (cloud)

- Node.js 22.22.0 et npm 10.9.4 disponibles ; le registre npm répond (Dexie 4.4.6 trouvé).
- Chromium préinstallé : les tests de bout en bout (Playwright) peuvent tourner dans le cloud.
- Je peux donc construire et tester l'application ici, puis tu la testes sur ton téléphone et ton PC.

### 1.3 Correspondance avec le chapitre 12 du CDC

| Étape CDC | État         |
| --------- | ------------ |
| 0. Audit  | Ce document  |
| 1 à 8     | Rien de fait |

---

## 2. Architecture proposée

Je reprends la pile recommandée par le CDC (§8.1), car rien d'existant ne s'y oppose.

| Couche                | Choix                                             | Pourquoi                                                                                             |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Langage               | TypeScript (mode strict)                          | Erreurs détectées avant l'exécution, important pour l'argent                                         |
| Interface             | React 18 + Vite                                   | Standard, rapide, bien documenté                                                                     |
| Navigation            | React Router                                      | 5 onglets + écrans de détail                                                                         |
| Styles                | CSS Modules + variables CSS (design tokens)       | Aucune bibliothèque UI à empiler ; thème clair/sombre simple                                         |
| Stockage local        | IndexedDB via **Dexie**                           | Hors ligne, transactions atomiques, migrations versionnées                                           |
| PWA                   | **vite-plugin-pwa** (Workbox)                     | Service worker maintenu, bannière « nouvelle version »                                               |
| Traductions           | Module maison typé (FR/EN) + `Intl` du navigateur | 2 langues seulement : pas besoin d'une grosse librairie ; TypeScript vérifie qu'aucune clé ne manque |
| Tests métier          | Vitest                                            | Rapide, même config que Vite                                                                         |
| Tests d'interface     | Testing Library                                   | Teste ce que voit l'utilisateur                                                                      |
| Tests de bout en bout | Playwright (Chromium, profils mobile + desktop)   | Parcours critiques et mode avion                                                                     |
| Qualité               | ESLint + Prettier + `tsc --noEmit`                | Lint et typage dans chaque validation                                                                |
| Serveur               | **Aucun**                                         | Conforme au CDC (§3.3, §8.1)                                                                         |

Dépendances d'exécution prévues (5) : `react`, `react-dom`, `react-router-dom`, `dexie`, `dexie-react-hooks`. Toutes gratuites, open source, sans envoi de données. Le reste ne sert qu'au développement.

### 2.1 Arborescence (d'après CDC §8.2)

```
Kolo/app/
  index.html, package.json, vite.config.ts, tsconfig.json, playwright.config.ts
  public/            icônes PWA
  src/
    app/             démarrage, routes, providers, mise en page, navigation
    components/      boutons, champs, montant, états vides, dialogues de confirmation
    features/
      onboarding/ dashboard/ accounts/ transactions/ budget/
      debts/ planned-expenses/ goals/ reports/ settings/
    domain/          types + calculs purs (aucun import React ni navigateur)
      money.ts currencies.ts dates.ts balances.ts budget.ts
      debts.ts planned.ts goals.ts reports.ts validation.ts
    data/
      repositories/  contrats (interfaces) de lecture/écriture
      local/         Dexie : schéma, migrations, implémentation des repositories
      backup/        export CSV, sauvegarde/restauration JSON
    i18n/            fr.ts, en.ts, formatage (montants, dates, nombres)
  tests/
    e2e/             scénarios Playwright
  docs/
    README.md DECISIONS.md LIMITES.md
```

Règle : les écrans n'appellent jamais Dexie directement (CDC §8.3), ils passent par les repositories ; les calculs passent par `domain/`.

### 2.2 Représentation de l'argent

- Montant stocké en **entier d'unités mineures** (centimes, etc.) : `amountMinor: number` + `currencyCode`.
- Nombre de décimales par devise lu dans une **table ISO 4217 embarquée** (`currencies.ts`, mise à jour possible) : JPY/XAF = 0, EUR/USD = 2, KWD/BHD = 3.
- Saisie : le texte tapé est converti sans passer par un flottant (découpage de la chaîne), refusé si trop de décimales ou ≤ 0.
- Garde-fou : refus de tout montant au-delà de `Number.MAX_SAFE_INTEGER` (≈ 9 billions d'unités, largement suffisant).
- Affichage uniquement via `Intl.NumberFormat` (jamais de symbole concaténé à la main).

### 2.3 Dates

- Date métier : chaîne locale `AAAA-MM-JJ` (ne change jamais de jour si le fuseau change).
- Horodatages techniques (`createdAt`, `updatedAt`) : ISO UTC.
- « Aujourd'hui » = date locale de l'appareil. Fonctions pures testées pour fin de mois, jours restants, février 28/29.

### 2.4 Données

- Chaque entité : `id` UUID (`crypto.randomUUID()`), `createdAt`, `updatedAt`, `archivedAt` si archivable.
- Base Dexie versionnée (`schemaVersion` = 1) avec migrations explicites.
- Entités : Account, Category, Transaction, Budget, Debt, DebtRepayment, PlannedExpense, SavingsGoal, Preferences, Meta.
- Les opérations liées (paiement d'une dépense planifiée, remboursement lié à un compte) s'écrivent dans **une seule transaction Dexie** : tout réussit ou rien.

---

## 3. Écarts, incohérences et points ambigus du CDC

Je propose une décision pour chacun. **Ce sont les points à valider.**

| #   | Sujet                               | Problème                                                                                                                         | Décision proposée                                                                                                                                                                                        |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Ajustement de solde                 | La formule du solde (§6.2) inclut des « ajustements », mais le type `adjustment` n'existe pas dans la liste des types (§5.3, §7) | Ajouter un type `adjustment` (avec sens + ou −), daté, exclu des revenus/dépenses/budget                                                                                                                 |
| A2  | Solde initial négatif               | Le CDC laisse le choix (§5.2)                                                                                                    | **Interdire en V1** ; un découvert se représente par un ajustement négatif                                                                                                                               |
| A3  | Prêt/emprunt et compte              | Créer une dette ne dit pas si l'argent sort/entre d'un compte (ex. je prête 50 en espèces)                                       | Option « enregistrer dans un compte » aussi **à la création** de la dette, même mécanisme que pour les remboursements (`debt_settlement`, hors budget). Sinon l'utilisateur saisirait une fausse dépense |
| A4  | Budget mensuel                      | Faut-il ressaisir la limite chaque mois ?                                                                                        | Une limite **reconduite chaque mois** jusqu'à modification ; une modification s'applique à partir du mois en cours                                                                                       |
| A5  | Catégories du budget                | `included_category_ids` sans règle par défaut                                                                                    | V1 : **toutes les catégories de dépense comptent** ; le champ existe dans les données pour plus tard                                                                                                     |
| A6  | Devise du budget                    | Dépenses dans d'autres devises                                                                                                   | Ignorées par le budget et signalées « non comptées (autre devise) »                                                                                                                                      |
| A7  | Restauration                        | Fusion « si fiable »                                                                                                             | V1 : **remplacement seulement**, avec export de secours automatique proposé juste avant                                                                                                                  |
| A8  | Transaction liée supprimée          | Que devient la dépense planifiée ou le remboursement si on supprime sa transaction ?                                             | Dépense planifiée : repasse « prévue » (après confirmation). Remboursement : la transaction ne se modifie/supprime que depuis la dette                                                                   |
| A9  | Dépense planifiée sans compte       | Compte « facultatif » mais une transaction réelle exige un compte                                                                | Le compte est demandé au moment de « Marquer comme payée »                                                                                                                                               |
| A10 | Fuseau horaire                      | `timezone` dans les préférences mais aucune règle de choix                                                                       | V1 : fuseau de l'appareil, affiché dans les paramètres ; pas de choix manuel                                                                                                                             |
| A11 | Suppression de compte               | « Procédure explicite » non définie                                                                                              | Suppression impossible si des opérations existent ; proposer l'archivage                                                                                                                                 |
| A12 | Montant initial d'une dette modifié | Peut devenir inférieur au déjà remboursé                                                                                         | Refusé avec message clair                                                                                                                                                                                |
| A13 | Hébergement                         | Une PWA installable doit être servie en HTTPS ; le CDC n'en parle pas                                                            | Hébergement statique gratuit (GitHub Pages ou Cloudflare Pages), à décider à l'étape 7. Aucun serveur de données                                                                                         |
| A14 | Où vit le code                      | Pas de dépôt Kolo                                                                                                                | Voir décision D1 ci-dessous                                                                                                                                                                              |

---

## 4. Décisions techniques importantes et compromis

**D1. Emplacement du code**

- Option recommandée : tu crées un **dépôt GitHub privé `kolo`** (vide) et me le dis ; je l'attache au projet. Avantages : historique, sauvegarde, tests automatiques (GitHub Actions), hébergement facile. Je ne peux pas créer le dépôt moi-même.
- En attendant : je travaille dans `/mnt/project-files/Kolo/app/` avec git local, puis je pousse tout dans le dépôt quand il existe. Rien n'est perdu.

**D2. Pile React + Vite + Dexie** (celle du CDC). Compromis : React est plus lourd que des alternatives (Svelte, Preact), mais c'est le plus documenté et le plus facile à reprendre par un autre développeur.

**D3. Entiers en unités mineures plutôt qu'une librairie décimale.** Compromis : simple, exact et sans dépendance ; ne gère pas les fractions de centime (inutile en V1, pas de conversion de devises).

**D4. Traductions maison plutôt qu'i18next.** Compromis : zéro dépendance et clés vérifiées par TypeScript ; pour beaucoup de langues plus tard, on pourra migrer.

**D5. Données non chiffrées dans IndexedDB.** Le navigateur isole les données par site, mais quelqu'un qui a accès au téléphone déverrouillé peut les lire. Ce sera écrit honnêtement dans l'app (CDC §3.3). Pas de mention « chiffré » ou « sécurité bancaire ».

**D6. Pas de budgets par catégorie en V1** (permis par CDC §5.5) pour garder le premier lot raisonnable.

---

## 5. Risques techniques

| Risque                                                                                                                        | Prévention                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Perte des données si le navigateur est effacé                                                                                 | Sauvegarde JSON testée, rappel discret, avertissement dans les paramètres                                           |
| iPhone (Safari) peut effacer les données d'un site non utilisé pendant ~7 jours s'il n'est pas installé sur l'écran d'accueil | Demander le stockage persistant (`navigator.storage.persist()`), inviter à installer la PWA, rappeler la sauvegarde |
| Erreur de calcul                                                                                                              | Calculs purs dans `domain/` + tests de cas limites                                                                  |
| Double comptage (dettes, planifiées)                                                                                          | Types séparés, liens par identifiant, écritures atomiques, tests double clic                                        |
| Mise à jour de l'app pendant une saisie                                                                                       | Bannière « nouvelle version » avec rechargement manuel                                                              |
| Périmètre qui gonfle                                                                                                          | Seul le « INDISPENSABLE V1.0 » est codé                                                                             |
| Tests sur vrai téléphone                                                                                                      | Les tests automatiques simulent mobile ; un test manuel sur ton téléphone sera nécessaire avant la sortie           |

---

## 6. Plan d'implémentation par lots

Chaque lot se termine par : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (et `npm run test:e2e` dès le lot 1), puis un compte rendu au format CDC §15.4. Je ne passe au lot suivant que si tout est vert.

### Lot 1 : Socle UI

- Fichiers : `package.json`, configs Vite/TS/ESLint/Playwright, `src/app/*`, `src/components/*`, `src/i18n/*`, `src/features/*/` (pages vides), `docs/README.md`.
- Contenu : 5 onglets (Accueil, Activité, Budget, Dettes, Plus), tokens de design, thème clair/sombre, FR/EN, états vides.
- Validation : l'app s'ouvre en largeur mobile (390 px) et desktop sans défilement horizontal ; test que FR et EN ont exactement les mêmes clés ; navigation au clavier.

### Lot 2 : Modèle local

- Fichiers : `src/domain/types.ts`, `money.ts`, `currencies.ts`, `dates.ts`, `src/data/repositories/*`, `src/data/local/db.ts`, `migrations.ts`.
- Validation : tests unitaires argent (0, 2, 3 décimales ; refus des flottants et négatifs), dates (fin de mois, bissextile) ; lecture/écriture testées (IndexedDB simulée via `fake-indexeddb`) ; test e2e : données toujours là après rechargement.

### Lot 3 : Comptes + transactions + catégories + onboarding

- Fichiers : `domain/balances.ts`, `validation.ts`, `features/accounts`, `features/transactions`, `features/onboarding`, catégories système traduites.
- Validation : tests §11.1 (solde, transfert neutre sur revenus/dépenses, modification/suppression recalculent) ; e2e « Premier lancement », « Ajouter une dépense », « Modifier une transaction », « Transfert ».

### Lot 4 : Tableau de bord + budget

- Fichiers : `domain/budget.ts`, `features/dashboard`, `features/budget`.
- Validation : allocation quotidienne testée sur mois de 28/29/30/31 jours, premier et dernier jour, budget dépassé = 0, dépense antidatée dans le bon mois ; totaux par devise sans addition croisée.

### Lot 5 : Dettes + dépenses planifiées + objectifs

- Fichiers : `domain/debts.ts`, `planned.ts`, `goals.ts`, `features/debts`, `features/planned-expenses`, `features/goals`.
- Validation : remboursement partiel, refus d'un remboursement trop grand, statut « en retard » dérivé ; double clic sur « payée » = une seule transaction ; règlement lié au compte hors budget ; e2e « Dette avec deux remboursements », « Dépense planifiée payée ».

### Lot 6 : Recherche, rapports, export

- Fichiers : `domain/reports.ts`, `data/backup/csv.ts`, `json.ts`, `features/reports`, `features/settings` (export/restauration/effacement).
- Validation : CSV UTF-8 avec les colonnes du CDC ; sauvegarde puis restauration dans une base vide identique ; JSON malformé, trop gros ou de version inconnue refusé sans rien écraser ; e2e « Exporter puis restaurer ».

### Lot 7 : PWA + finition

- Fichiers : `vite.config.ts` (manifest, service worker), icônes, bannière de mise à jour, messages d'erreur de stockage, accessibilité.
- Validation : e2e « Mode avion » (consultation + saisie hors ligne) ; installation ; audit d'accessibilité automatique (axe) ; choix de l'hébergement.

### Lot 8 : Revue finale

- Tous les tests, revue de sécurité (aucune donnée sensible dans les logs, pas de HTML injecté, `npm audit`), relecture des textes FR/EN, docs à jour (`README`, `DECISIONS.md`, `LIMITES.md`), checklist de test manuel sur ton téléphone et ton PC.

---

## 7. Commandes prévues (créées au lot 1)

```
cd Kolo/app
npm install          # installer
npm run dev          # lancer en local (http://localhost:5173)
npm test             # tests métier et interface (Vitest)
npm run test:e2e     # parcours de bout en bout (Playwright)
npm run lint         # vérification du style
npm run typecheck    # vérification TypeScript
npm run build        # version de production
```

---

## 8. Ce que j'attends de toi

1. Valider ou modifier les décisions A1 à A13 (tu peux répondre « OK pour tout »).
2. D1 : créer un dépôt GitHub privé `kolo`, ou me laisser commencer dans le dossier du projet.
3. Ton feu vert pour démarrer le **lot 1** uniquement.
