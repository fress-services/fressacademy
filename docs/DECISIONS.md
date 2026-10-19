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

## Lot 5

| Décision                                                                                                                    | Raison                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Statut d'une dette (ouverte, partiellement remboursée, réglée) et « en retard » toujours calculés                           | §5.6 : jamais saisis à la main. « En retard » = échéance passée et reste à payer.                                                                           |
| Mouvement d'argent facultatif à la création d'une dette et à chaque remboursement, en opération `debt_settlement` liée      | Décision A3 et §5.6 : le solde change, mais ni revenus, ni dépenses, ni budget. La case est décochée à chaque fois et le texte dit ce qui arrive au compte. |
| Seuls les comptes actifs de la même devise sont proposés                                                                    | §5.6 : pas de remboursement dans une autre devise.                                                                                                          |
| Un remboursement ne dépasse jamais le reste ; le montant initial ne descend pas sous le déjà remboursé                      | §5.6 et décision A12.                                                                                                                                       |
| « Marquer comme payée » relit la dépense prévue dans la même transaction et renvoie l'opération déjà créée                  | §5.7 : idempotent, un double clic ne crée qu'une dépense. Le bouton est aussi désactivé pendant l'enregistrement.                                           |
| Compte demandé au paiement, catégorie « Autres dépenses » par défaut                                                        | Décision A9.                                                                                                                                                |
| Supprimer l'opération d'une dépense payée la remet « prévue »                                                               | Décision A8.                                                                                                                                                |
| Objectifs : progression saisie, bornée de 0 à 100 %                                                                         | §5.8 : n'influence jamais un solde ni le budget, et c'est écrit près du champ.                                                                              |
| Dépenses prévues et objectifs dans « Plus » ; l'accueil montre les 3 prochaines échéances et les dettes ouvertes par devise | Garder 5 onglets ; §5.1 demande les échéances proches sur l'accueil.                                                                                        |

## Lot 6

| Décision                                                                                                                                                       | Raison                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Restauration en remplacement seulement, après aperçu, case de confirmation et sauvegarde de secours proposée                                                   | Décision A7 : la fusion n'est pas assez fiable en V1.                                                                                    |
| Fichier entièrement lu et vérifié avant toute écriture (format, version, type de chaque champ, liens entre objets), puis remplacement en une seule transaction | §5.11 et §9.3 : un fichier refusé ou un échec n'écrase rien. Les champs inconnus sont ignorés.                                           |
| Refus d'un fichier de plus de 20 Mo, d'un format ou d'une version de schéma plus récente                                                                       | §5.11. Les messages ne citent jamais le contenu du fichier (§9.1).                                                                       |
| CSV : virgule, point décimal, montant signé (négatif pour une sortie, positif pour un transfert), UTF-8 avec BOM, en-têtes dans la langue choisie              | Ouvrable dans tout tableur et additionnable ; le BOM fait lire les accents par Excel.                                                    |
| Cellules de texte commençant par = + - @ préfixées d'une apostrophe                                                                                            | Protection contre l'injection de formules (OWASP).                                                                                       |
| Recherche sans accent ni majuscule, chaque mot doit apparaître ; porte sur libellé, note et nom de catégorie (dettes : nom et note)                            | §5.9, entièrement sur l'appareil.                                                                                                        |
| Filtres gardés dans l'adresse de la page                                                                                                                       | Le retour depuis une opération retrouve la même recherche.                                                                               |
| Rapport par devise ; comparaison avec le mois précédent en écart de montant (« 12,00 € de plus »), sans couleur de jugement                                    | §5.9 : comparaisons seulement dans la même devise, rapports informatifs ; « Pas encore assez de données » si le mois précédent est vide. |
| Effacement : case « J'ai compris » puis « Tout effacer » ; la langue et le thème sont gardés                                                                   | §9.2 : confirmation distincte ; l'écran de premier lancement reste dans la langue de l'utilisateur.                                      |
| Rappel discret sur l'accueil à partir de 10 opérations, si aucune sauvegarde depuis 30 jours ; date de la dernière sauvegarde dans la page Sauvegarde          | §9.3 : rappeler sans harceler.                                                                                                           |
| Restauration proposée dès le premier lancement                                                                                                                 | Cas d'usage « nouvel appareil » sans devoir créer un compte d'abord.                                                                     |

## Lot 7

| Décision                                                                                       | Raison                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service worker généré par `vite-plugin-pwa` (Workbox), fichiers de l'application seulement     | §8.3 et §8.4 : solution maintenue ; aucune donnée privée dans le cache, elles restent dans IndexedDB.                                                             |
| Mise à jour « à la demande » : bandeau « Nouvelle version… Recharger / Plus tard »             | §8.4 : ne pas interrompre une saisie en cours.                                                                                                                    |
| Pas d'annonce « prêt hors ligne » ni d'indicateur réseau                                       | Rien en V1 ne dépend de la connexion (§4) ; un bandeau qui apparaît décalerait la page sous le doigt. Un échec d'activation du mode hors ligne est, lui, signalé. |
| Bandeau dans le flux en haut de page, jamais par-dessus le contenu                             | Il ne doit jamais masquer un bouton (constaté pendant les tests).                                                                                                 |
| Icônes PNG générées depuis le SVG par `npm run icons` ; icône « maskable » à fond plein        | Android découpe l'icône selon sa forme ; la lettre reste dans la zone sûre.                                                                                       |
| Chemin de publication réglable (`KOLO_BASE`), routeur et manifeste en tiennent compte          | GitHub Pages publie sous `/<dépôt>/`. `404.html` renvoie les adresses directes vers l'application.                                                                |
| Hébergement : GitHub Pages, publication à chaque fusion dans `main`                            | Décision A13 : gratuit, statique, HTTPS, sans compte supplémentaire. Confirmé par l'utilisateur ; changeable plus tard (sauvegarde puis restauration).            |
| Audit axe (WCAG 2.2 A/AA) sur toutes les pages, thèmes sombre et clair, sans violation tolérée | §10.2 ; à compléter par un test manuel au lecteur d'écran (lot 8).                                                                                                |
| Bibliothèques dans un fichier `vendor` séparé                                                  | Cache plus durable entre deux versions ; supprime l'avertissement de taille.                                                                                      |

## Lot 8

| Décision                                                                                             | Raison                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Politique de sécurité du contenu (CSP) dans la version publiée : seuls les fichiers de l'application | §9 : même si un texte malveillant passait, il ne pourrait ni charger ni envoyer quoi que ce soit.        |
| Un montant avec plus de décimales que la devise est refusé, même « 2,500 » en euros                  | Lire 2,50 € à la place de 2 500 € serait une erreur silencieuse ; un refus avec message est sans danger. |
| Montant saisi maximum : 10^13 unités mineures (100 milliards d'euros, 10 000 milliards de FCFA)      | Les soldes et totaux restent des entiers exacts ; aucun écran ne peut planter sur une somme.             |
| L'opération qui paie une dépense prévue reste une dépense                                            | Sinon la dépense prévue resterait « payée » par un revenu ou un transfert.                               |
| La restauration vérifie les règles de chaque type d'opération et refuse les totaux qui débordent     | Un fichier modifié à la main ne doit pas rendre l'application inutilisable après remplacement.           |
| Version 1.0.0                                                                                        | Fin du périmètre V1.                                                                                     |
