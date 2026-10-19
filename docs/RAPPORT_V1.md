# Rapport final de la V1

Version 1.0.0, 19 octobre 2026. Livrable du cahier des charges §11.3 et §15 : rapport des
tests, limites connues et guide de lancement.

## 1. Ce que contient la V1

Tout le périmètre V1 du cahier des charges, livré en 8 lots (détail dans
[PLAN_V1.md](PLAN_V1.md), choix dans [DECISIONS.md](DECISIONS.md)) :

- Premier lancement guidé, langue (FR/EN), devise principale, thème sombre vert ou clair.
- Comptes multi-devises, soldes, ajustements, archivage ; catégories fournies et personnelles.
- Revenus, dépenses, transferts ; activité avec recherche et filtres.
- Limite mensuelle de dépenses, reste à dépenser et montant par jour.
- Dettes (à récupérer, à rembourser) et remboursements ; dépenses prévues ; objectifs.
- Rapport mensuel par devise et par catégorie, comparé au mois précédent.
- Export CSV, sauvegarde et restauration JSON, effacement complet.
- Application installable (PWA), utilisable hors ligne, mise à jour sur demande.

Rien de la roadmap (V1.1 et après) n'a été ajouté : pas de compte en ligne, de synchronisation,
de conversion de devises, d'import bancaire ni de budget par catégorie.

## 2. Tests automatiques

Tous passent sur la branche du lot 8 (environnement cloud, Node 22, Chromium) :

| Vérification                       | Commande            | Résultat                      |
| ---------------------------------- | ------------------- | ----------------------------- |
| Règles de code et accessibilité    | `npm run lint`      | 0 erreur, 0 avertissement     |
| Types TypeScript                   | `npm run typecheck` | 0 erreur                      |
| Tests métier, données et interface | `npm test`          | 216 tests, 24 fichiers        |
| Parcours de bout en bout           | `npm run test:e2e`  | 23 scénarios × 2 profils = 46 |
| Version de production              | `npm run build`     | sans avertissement            |
| Dépendances                        | `npm audit`         | 0 vulnérabilité connue        |

Les parcours de bout en bout tournent sur un profil téléphone (Pixel 7) et un profil ordinateur.
Ils couvrent : premier lancement, saisie, budget, dettes, dépenses prévues, recherche, rapport,
sauvegarde et restauration, persistance après rechargement, mode avion, sous-chemin GitHub
Pages, audit d'accessibilité axe (WCAG 2.2 A/AA, 15 pages, thèmes sombre et clair) et sécurité.

La CI GitHub (`verifier`) relance lint, types, tests, build et parcours à chaque PR.

## 3. Revue finale (lot 8)

**Sécurité.** Aucune donnée écrite dans la console, aucun HTML injecté (`innerHTML`, `eval`
absents ; un libellé `<img onerror>` s'affiche comme du texte, test automatique), aucun appel
réseau, aucun secret dans le dépôt. Ajout d'une politique de sécurité du contenu (CSP) qui
n'autorise que les fichiers de l'application. Le CSV neutralise les formules de tableur.

**Défauts trouvés et corrigés pendant la revue :**

| Défaut                                                                                  | Correction                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| « 2,500 » en euros était lu comme 2,50 € (séparateur de milliers pris pour une virgule) | Plus de décimales que la devise n'en a est refusé, même des zéros         |
| Un montant énorme pouvait faire planter les écrans de soldes                            | Montant maximum 10^13 unités mineures ; ajustement et sauvegarde vérifiés |
| L'opération qui paie une dépense prévue pouvait devenir un revenu ou un transfert       | Son type est verrouillé (écran et règle métier)                           |
| Une sauvegarde modifiée à la main pouvait contenir une opération sans compte            | La restauration vérifie les règles de chaque type d'opération             |
| Un remboursement sans date affichait une erreur générale                                | L'erreur s'affiche sur le champ date                                      |

**Textes.** Relecture complète FR et EN ; quelques tournures corrigées. Les tests vérifient que
chaque texte existe dans les deux langues avec les mêmes paramètres.

## 4. Ce qui reste à vérifier à la main

Les tests automatiques simulent un téléphone ; ils ne remplacent pas :

- un essai sur un vrai téléphone Android et un iPhone (installation, icône, mode avion) ;
- un passage au lecteur d'écran (TalkBack, VoiceOver) ;
- l'ouverture du CSV dans Excel ou LibreOffice.

La liste à cocher est dans [TEST_MANUEL.md](TEST_MANUEL.md).

## 5. Limites connues

Voir [LIMITES.md](LIMITES.md). Les principales : données non chiffrées sur l'appareil et dans
la sauvegarde, aucune synchronisation (la sauvegarde manuelle est le seul moyen de changer
d'appareil), restauration par remplacement seulement, pas de conversion entre devises.

## 6. Guide de lancement

**Publier (une seule fois) :**

1. Sur GitHub, dépôt > Settings > Pages > Source : « GitHub Actions ».
2. Fusionner les PR des lots dans `main`, dans l'ordre (1 à 8).
3. Onglet Actions : attendre que « Publier sur GitHub Pages » soit vert.
4. Ouvrir `https://<compte>.github.io/<dépôt>/`, puis dérouler [TEST_MANUEL.md](TEST_MANUEL.md).

**Développer en local :**

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # lint, types, tests, build et parcours de bout en bout
```

Les autres commandes sont dans le [README](../README.md#commandes).
