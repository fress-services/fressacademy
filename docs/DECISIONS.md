# Décisions techniques

Les décisions A1 à A13 et D1 à D6 du [plan](PLAN_V1.md) ont été validées le 19 octobre 2026.
Le code vit à la racine de ce dépôt (et non dans `Kolo/app/` comme écrit dans le plan).

## Lot 1

| Décision                                                            | Raison                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React 19, React Router 7, Vite 8, TypeScript 5.9                    | Versions stables actuelles. TypeScript 5.9 plutôt que 7 car l'outil de lint (typescript-eslint) ne prend pas encore en charge la version 7. Le plan mentionnait React 18 : la 19 est la version stable courante, sans impact sur l'architecture. |
| ESLint 9 (pas 10)                                                   | Le module d'accessibilité `eslint-plugin-jsx-a11y` ne prend pas encore en charge ESLint 10.                                                                                                                                                      |
| Traductions maison typées (`src/i18n`)                              | Deux langues seulement. TypeScript refuse une clé manquante en anglais ; un test vérifie aussi que les clés et variables sont identiques.                                                                                                        |
| Routes en anglais (`/activity`, `/debts`…)                          | Les adresses ne changent pas quand on change de langue.                                                                                                                                                                                          |
| CSS Modules + variables CSS                                         | Pas de bibliothèque d'interface ; thème sombre via `prefers-color-scheme`.                                                                                                                                                                       |
| Polices système                                                     | Aucune requête vers un service tiers (Google Fonts, etc.).                                                                                                                                                                                       |
| Langue et thème non mémorisés au lot 1                              | Ils seront enregistrés avec les préférences dans IndexedDB au lot 2 (pas de `localStorage` en double).                                                                                                                                           |
| `no-console` en erreur (sauf `console.error`)                       | Éviter qu'un montant ou une note finisse dans la console (cahier des charges §9.1).                                                                                                                                                              |
| Tests de bout en bout sur la version de production (`vite preview`) | On teste ce qui sera réellement livré.                                                                                                                                                                                                           |

## Style visuel

| Décision                                                                                     | Raison                                                                                                                            |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Thème « sombre vert premium » par défaut (fond vert nuit, accent émeraude, cartes arrondies) | Choix du fondateur le 19 octobre 2026 d'après ses maquettes. Thème clair et « comme l'appareil » disponibles dans les paramètres. |

## Lot 2

| Décision                                                                                      | Raison                                                                                                                                            |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Montants en entiers d'unités mineures + table ISO 4217 embarquée (`src/domain/currencies.ts`) | Aucun flottant (cahier des charges §6.1). Le nombre de décimales vient de l'ISO, pas du navigateur (qui diffère parfois).                         |
| Saisie : virgule ou point acceptés comme séparateur décimal, espaces ignorés, signes refusés  | Claviers français et anglais ; le sens d'une opération est porté par son type. « 1,005 » en EUR est refusé (trop de décimales) plutôt que deviné. |
| Dates métier en chaînes `AAAA-MM-JJ`, horodatages techniques en ISO UTC                       | Une opération ne change pas de jour si le fuseau change (§6.3).                                                                                   |
| Type d'opération `adjustment` et champ `flow` (entrée/sortie)                                 | Décision A1 : ajustement de solde explicite ; `flow` donne le sens des règlements de dette et ajustements.                                        |
| `Debt.openingTransactionId`                                                                   | Décision A3 : mouvement d'argent facultatif à la création d'une dette.                                                                            |
| Dexie 4 (IndexedDB), une table par entité, `runAtomic` pour les écritures liées               | Stockage hors ligne structuré, transactions tout-ou-rien, migrations versionnées.                                                                 |
| Erreurs de stockage converties en codes (`StorageError`) sans le message d'origine            | Pas d'erreur brute de base de données à l'écran ni de donnée personnelle dans les journaux.                                                       |
| Une base créée par une version plus récente de Kolo est refusée à l'ouverture                 | Protège les données d'une ancienne version de l'app (Dexie 4 l'ouvrirait sinon).                                                                  |
| Préférences : un enregistrement unique complété par des valeurs par défaut                    | Un champ ajouté plus tard n'exige pas de migration.                                                                                               |
| Protection contre l'effacement (`navigator.storage.persist`) demandée seulement sur bouton    | Firefox affiche une autorisation : on ne la déclenche pas au démarrage.                                                                           |
| `fake-indexeddb` pour les tests                                                               | Teste la vraie couche Dexie sans navigateur.                                                                                                      |
| `dexie-react-hooks` non utilisé (voir lot 3)                                                  | Remplacé par un abonnement maison aux écritures.                                                                                                  |

## Lot 3

| Décision                                                                                                                  | Raison                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Couche `src/services/` : chaque écriture passe par un service qui valide et lève `ValidationError` ou `BusinessError`     | Les règles (§7.1) s'appliquent même si un écran les oublie ; les messages restent traduisibles.          |
| Les écrans relisent les données après chaque écriture (`subscribe` + `useRepositoryQuery`) au lieu de `dexie-react-hooks` | Soldes et totaux toujours recalculés, sans dépendance de plus, et testable avec n'importe quel stockage. |
| Premier lancement en 3 étapes (langue, devise, compte facultatif) qui remplace l'application tant qu'il n'est pas terminé | §4.1. L'étape budget sera ajoutée au lot 4. Rien n'est marqué terminé avant la dernière étape.           |
| Devise suggérée d'après la région du navigateur (fr-CM → XAF), jamais imposée ; sans région, aucune suggestion            | On ne suppose ni pays ni devise.                                                                         |
| Catégorie obligatoire pour revenus et dépenses, pré-remplie avec « Autres dépenses » / « Autres revenus »                 | Statistiques cohérentes sans ralentir la saisie.                                                         |
| Devise d'une opération = devise du compte, jamais saisie                                                                  | Pas de conversion en V1.                                                                                 |
| Devise d'un compte verrouillée dès qu'une opération l'utilise                                                             | Changer la devise fausserait l'historique.                                                               |
| Compte supprimable seulement s'il n'est pas utilisé ; sinon archivage (décision A11)                                      | Conserver l'historique.                                                                                  |
| Ajustement : supprimable, non modifiable ; règlement de dette : géré depuis la dette (A8)                                 | Éviter des incohérences entre l'opération et ce qui l'a créée.                                           |
| Suppression en deux temps (bouton puis « Oui, supprimer »)                                                                | Pas de fenêtre de confirmation native, accessible au clavier et au lecteur d'écran.                      |

## Lot 4

| Décision                                                                                                                         | Raison                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Une limite = un enregistrement `Budget` avec `startMonth` ; le mois utilise la plus récente commencée avant ou pendant ce mois   | Décision A4 : limite reconduite ; une modification s'applique à partir du mois en cours sans réécrire les mois passés. |
| Toutes les dépenses (`expense`) du mois dans la devise du budget comptent ; les autres devises sont comptées à part et signalées | Décisions A5 et A6, formule du §5.5. Revenus, transferts, ajustements et règlements de dette n'y entrent jamais.       |
| Montant par jour = reste ÷ jours restants (aujourd'hui inclus), arrondi vers le bas à l'unité mineure, zéro si dépassé           | Ne jamais annoncer un peu plus que ce qui reste ; formule du §5.5.                                                     |
| Dépassement montré par un message, un reste négatif et une jauge rouge                                                           | §5.5 : ne pas cacher le dépassement.                                                                                   |
| Le mois affiché sur l'accueil se change avec « Mois précédent / suivant », sans aller dans le futur                              | §5.1 : période courante avec accès au mois précédent.                                                                  |
| Premier lancement en 4 étapes ; le compte saisi n'est enregistré qu'à la dernière, avec la limite, en une seule écriture         | §4.1 ; rien n'est à moitié enregistré si l'utilisateur quitte en cours de route.                                       |
