# Limites connues

Mise à jour : lot 3.

- Budget, dettes, dépenses planifiées, objectifs, export et import arrivent aux lots 4 à 6.
  Le premier lancement ne propose donc pas encore de limite de budget.
- Pas de transfert entre deux devises (aucune conversion en V1).
- Un solde initial ne peut pas être négatif ; un découvert se saisit par un ajustement.
- Un ajustement de solde ne se modifie pas : on le supprime puis on en refait un.
- Pas encore de recherche ni de filtre dans l'activité (prévu au lot 6).
- Le champ date utilise le sélecteur du navigateur : son format suit la langue du navigateur,
  pas celle choisie dans Kolo.
- Les données ne sont pas chiffrées sur l'appareil : une personne qui a accès à l'appareil
  déverrouillé peut les lire. C'est expliqué dans « Vos données ».
- Le fuseau horaire est celui de l'appareil (décision A10), sans choix manuel.
- Le catalogue des devises (`src/domain/currencies.ts`) doit être mis à jour à la main quand
  l'ISO 4217 change.
- Pas encore installable ni utilisable hors ligne : PWA prévue au lot 7.
- Pas encore hébergée en ligne : choix de l'hébergement au lot 7. Un hébergement statique devra
  renvoyer `index.html` pour toutes les adresses (navigation côté client).
- Les tests automatiques simulent un téléphone (profil Pixel 7 dans Chromium) ; un test manuel
  sur un vrai téléphone reste nécessaire avant la sortie.
