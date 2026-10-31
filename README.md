# Cintre

Prototype de dressing numérique : une application web mobile, installable, dont tout le code tient dans `index.html`.

- En ligne : https://trenchshild.github.io/Cintre/
- Installation : Safari → Partager → « Sur l'écran d'accueil » (iPhone), ou menu → « Installer l'application » (Android/Chrome).
- Hors connexion : l'app s'ouvre sans réseau grâce au service worker (`sw.js`). La météo et les fonctions Claude demandent une connexion.
- Météo : prévision du jour via Open-Meteo (gratuit, sans clé). Elle règle la tenue du jour : ressenti, pluie.
- Données : stockées dans le navigateur (export et import dans Réglages).
- Fonctions IA : nécessitent une clé API Claude, à coller dans Réglages.

Après une modification de `index.html`, augmente `VERSION` dans `sw.js` pour que les téléphones déjà installés reçoivent les nouvelles icônes et le nouveau manifest.
