# Cintre

Prototype de dressing numérique : une application web mobile, installable. Tout le code de l'app tient dans `index.html`.

- En ligne : https://trenchshild.github.io/Cintre/
- Écrans : connexion, Accueil, Aujourd'hui (tenue du jour), Dressing, Tenues et calendrier, Envies, Styliste (conversation avec Claude), Revente.
- Comptes : identifiant et mot de passe via Supabase. Les données se synchronisent entre appareils et l'app fonctionne hors ligne : les modifications sont envoyées au retour du réseau. Un mode « sans compte » garde les données sur l'appareil.
- Installation : Safari → Partager → « Sur l'écran d'accueil » (iPhone), ou menu → « Installer l'application » (Android/Chrome).
- Météo : prévision du jour via Open-Meteo (gratuit, sans clé).
- Fonctions IA (tags automatiques, scan en lot, styliste, recherche en boutique) : nécessitent une clé API Claude, à coller dans Réglages.

## Mise en place de Supabase (une seule fois)

L'app utilise le projet Supabase de Vestia (`zvxzzojzbytyrndangro`), avec sa propre table : la table `wardrobes` de Vestia n'est pas touchée.

1. **Créer la table** : Supabase → SQL Editor → New query → coller le contenu de `supabase/cintre.sql` → Run.
2. **Autoriser l'inscription sans e-mail** : Authentication → Sign In / Providers → Email.
   - « Allow new users to sign up » : activé.
   - « Confirm email » : désactivé. Les identifiants sont convertis en adresses techniques (`identifiant@users.vestia.invalid`) qui ne reçoivent pas d'e-mail.

Les comptes Vestia existants fonctionnent aussi dans Cintre, avec le même identifiant et le même mot de passe.

## Maintenance

Après une modification, augmente `VERSION` dans `sw.js` pour que les téléphones où l'app est installée reçoivent la nouvelle version.
