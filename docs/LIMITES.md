# Limites connues

Mise à jour : lot 8 (V1 1.0.0).

- Restauration en remplacement seulement : pas de fusion de deux appareils (décision A7).
- Le CSV est un export ; l'import d'un relevé bancaire CSV est prévu plus tard (roadmap V1.4).
- Le CSV utilise la virgule et le point décimal : un tableur réglé en français peut demander de
  choisir le séparateur à l'ouverture.
- Le fichier de sauvegarde n'est pas chiffré : il faut le garder dans un endroit privé.
- Le rappel de sauvegarde ne sait pas si le fichier téléchargé a bien été conservé.
- Le rapport ne couvre qu'un mois à la fois, sans graphique de tendance (roadmap V1.3).
- Un remboursement ne se modifie pas : on le supprime puis on le saisit à nouveau.
- Le sens d'une dette (à récupérer ou à rembourser) ne change plus après sa création.
- Supprimer une dette supprime aussi ses remboursements et les mouvements de compte liés.
- Les dépenses prévues sont ponctuelles : pas de répétition automatique en V1.
- Une dépense prévue payée se corrige depuis l'opération créée ; supprimer cette opération la
  remet « prévue ».
- Une seule limite de budget globale, sans budget par catégorie (décision D6).
- Retirer la limite efface aussi celles des mois passés ; la modifier ne change que le mois en
  cours et les suivants.
- Le montant par jour est arrondi vers le bas à l'unité de la devise (au centime pour l'euro).
- Pas de transfert entre deux devises (aucune conversion en V1).
- Un solde initial ne peut pas être négatif ; un découvert se saisit par un ajustement.
- Un ajustement de solde ne se modifie pas : on le supprime puis on en refait un.
- Le champ date utilise le sélecteur du navigateur : son format suit la langue du navigateur,
  pas celle choisie dans Kolo.
- Les données ne sont pas chiffrées sur l'appareil : une personne qui a accès à l'appareil
  déverrouillé peut les lire. C'est expliqué dans « Vos données ».
- Le fuseau horaire est celui de l'appareil (décision A10), sans choix manuel.
- Le catalogue des devises (`src/domain/currencies.ts`) doit être mis à jour à la main quand
  l'ISO 4217 change.
- Le nom des devises vient du navigateur : une devise récente (SLE, VED…) peut s'afficher avec
  son code seul si le navigateur ne connaît pas encore son nom.
- Hors ligne seulement après une première ouverture avec Internet.
- Sur iPhone, l'installation se fait à la main (Partager > « Sur l'écran d'accueil ») : Safari
  ne propose pas de bouton d'installation.
- Les données sont liées à l'adresse du site : changer d'adresse (renommer le dépôt, changer
  d'hébergeur) demande une sauvegarde puis une restauration.
- La mise en ligne sur GitHub Pages demande d'activer Pages une fois dans les réglages du dépôt.
- L'audit automatique d'accessibilité ne remplace pas un test au lecteur d'écran : à faire avec
  [TEST_MANUEL.md](TEST_MANUEL.md).
- Un montant s'écrit sans séparateur de milliers (« 2500 » ou « 2 500 ») : « 2,500 » en euros est
  refusé, pour ne jamais être lu comme 2,50 €.
- Montant maximum par saisie : 10^13 unités mineures, soit 100 milliards pour une devise à deux
  décimales (euro, dollar) et 10 000 milliards pour une devise sans décimales (franc CFA, yen).
- L'opération qui paie une dépense prévue reste une dépense : pour en changer le type, la
  supprimer (la dépense redevient « prévue ») puis saisir la bonne opération.
- Les tests automatiques simulent un téléphone (profil Pixel 7 dans Chromium) ; un test manuel
  sur un vrai téléphone reste nécessaire avant la sortie.
