# Limites connues

Mise à jour : lot 2.

- Aucun écran de saisie encore : comptes, opérations, dettes, etc. arrivent aux lots 3 à 5.
  Le modèle de données et le stockage sont prêts et testés.
- Les états vides n'ont pas encore de bouton d'action.
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
