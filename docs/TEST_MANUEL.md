# Test manuel avant la sortie

À faire sur un vrai téléphone (Android et, si possible, iPhone) et sur un ordinateur, avec
l'adresse publiée sur GitHub Pages. Utiliser uniquement des données inventées.

Cocher chaque ligne ; noter tout écart (écran, appareil, étapes) pour le corriger.

## 1. Mise en ligne

- [ ] Settings > Pages > Source : « GitHub Actions » est réglé (une seule fois).
- [ ] Après la fusion dans `main`, l'action « Publier sur GitHub Pages » est verte (onglet
      Actions).
- [ ] L'adresse `https://<compte>.github.io/<dépôt>/` ouvre Kolo.
- [ ] Une adresse directe (par exemple `…/<dépôt>/budget`) ouvre bien la page, même après
      actualisation.

## 2. Premier lancement

- [ ] La langue proposée suit celle du téléphone ; on peut la changer.
- [ ] La devise proposée est cohérente ; on peut en choisir une autre (essayer XOF, JPY).
- [ ] Le premier compte et la limite mensuelle sont facultatifs.
- [ ] Après « Commencer », l'accueil s'affiche.

## 3. Saisie au quotidien (téléphone, une main)

- [ ] Ajouter une dépense en moins de 10 secondes depuis l'accueil.
- [ ] Ajouter un revenu, puis un transfert entre deux comptes de même devise.
- [ ] Le clavier numérique s'ouvre pour les montants ; la virgule et le point sont acceptés.
- [ ] Modifier puis supprimer une opération ; le solde du compte suit.
- [ ] Les boutons restent atteignables au pouce ; rien n'est caché par la barre du bas ni par
      le clavier.

## 4. Budget, dettes, dépenses prévues, objectifs

- [ ] Fixer une limite mensuelle ; le montant restant et le montant par jour sont justes.
- [ ] Dépasser la limite : le message de dépassement s'affiche, sans couleur seule.
- [ ] Créer une dette « à récupérer », saisir un remboursement partiel, puis le solde.
- [ ] Créer une dépense prévue, la marquer payée : une opération est créée sur le compte choisi.
- [ ] Créer un objectif ; son avancement ne change aucun solde.

## 5. Recherche et rapport

- [ ] Rechercher un libellé sans accent (« marche » trouve « Marché »).
- [ ] Combiner des filtres (type, compte, dates) ; « Effacer » remet tout.
- [ ] Le rapport du mois affiche revenus, dépenses, catégories et la comparaison au mois
      précédent, une carte par devise.

## 6. Sauvegarde, restauration, effacement

- [ ] « Télécharger une sauvegarde » : le fichier `kolo-sauvegarde-AAAA-MM-JJ.json` arrive dans
      les téléchargements.
- [ ] Export CSV : le fichier s'ouvre dans un tableur, accents corrects.
- [ ] Sur un **autre** navigateur ou appareil : premier lancement > « J'ai déjà une sauvegarde
      Kolo » > choisir le fichier > l'aperçu est juste > restaurer : tout est là.
- [ ] Choisir un fichier qui n'est pas une sauvegarde (une photo) : refus clair, rien ne change.
- [ ] « Tout effacer » demande une confirmation et ramène au premier lancement.

## 7. Installation et hors ligne

- [ ] Android (Chrome) : menu ⋮ > « Installer l'application » ; l'icône Kolo apparaît, sans
      bord blanc ni lettre coupée.
- [ ] iPhone (Safari) : Partager > « Sur l'écran d'accueil » ; l'icône est correcte.
- [ ] L'application installée s'ouvre en plein écran, sans barre d'adresse.
- [ ] Mode avion : l'application s'ouvre, on peut saisir une opération ; elle est toujours là
      après fermeture et réouverture.
- [ ] Après une nouvelle fusion dans `main` : le bandeau « Nouvelle version » apparaît ;
      « Recharger » charge la nouvelle version sans perdre de données.

## 8. Ordinateur

- [ ] Barre de navigation latérale ; mise en page lisible de 1280 px à plein écran.
- [ ] Tout se fait au clavier seul (Tab, Entrée, Espace, Échap) ; le focus est toujours visible.
- [ ] Zoom du navigateur à 200 % : rien n'est coupé ni superposé.

## 9. Accessibilité (lecteur d'écran)

- [ ] Android TalkBack ou iPhone VoiceOver : la navigation du bas, un formulaire d'opération et
      le budget se lisent dans l'ordre, chaque champ annonce son nom et ses erreurs.
- [ ] Thème clair et thème sombre : les textes restent lisibles en plein soleil.
- [ ] Taille de texte du téléphone au maximum : rien n'est coupé.

## 10. Langue

- [ ] Passer en anglais dans Plus > Paramètres : tous les écrans, messages d'erreur et fichiers
      exportés sont en anglais ; les montants et dates suivent le format anglais.
