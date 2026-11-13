# Cintre

Prototype de dressing numérique : une application web mobile, installable. Tout le code de l'app tient dans `index.html`.

- En ligne : https://trenchshild.github.io/Cintre/
- Écrans : connexion, Accueil, Aujourd'hui (tenue du jour), Dressing, Tenues et calendrier, Envies, Styliste (conversation avec Claude), Revente.
- Comptes : identifiant et mot de passe via Supabase. Les données se synchronisent entre appareils et l'app fonctionne hors ligne : les modifications sont envoyées au retour du réseau. Un mode « sans compte » garde les données sur l'appareil.
- Installation : Safari → Partager → « Sur l'écran d'accueil » (iPhone), ou menu → « Installer l'application » (Android/Chrome).
- Météo : prévision du jour via Open-Meteo (gratuit, sans clé).
- IA gratuite sur l'appareil : détourage (U²-Net, 5 Mo, toujours actif) et reconnaissance du type de vêtement (Marqo-FashionSigLIP, 61 Mo, à activer), sans compte ni envoi de photo. Voir `ai/README.md`.
- Sans compte ni clé : détourage IA sur l'appareil (U²-Net) avec retouche au doigt, finition studio (pièce redressée, centrée sur fond blanc, couleurs et lumière équilibrées, ombre douce), guide de prise de vue, détection des couleurs, scan en lot en entourant chaque pièce, styliste à base de règles.
- Avec une clé API Claude (facultative, dans Réglages) : reconnaissance du type de vêtement, scan en lot automatique, styliste en conversation libre, recherche en boutique en direct.

## Mise en place de Supabase (une seule fois)

Projet Supabase : `qogdwrfensailwsknnxc` (adresse et clé publique dans `CLOUD`, en haut du module « Comptes » de `index.html`).

1. **Créer la table** : Supabase → SQL Editor → New query → coller le contenu de `supabase/cintre.sql` → Run.
2. **Autoriser l'inscription sans e-mail** : Authentication → Sign In / Providers → Email.
   - « Allow new users to sign up » : activé.
   - « Confirm email » : désactivé. Les identifiants sont convertis en adresses techniques (`identifiant@users.cintre.invalid`) qui ne reçoivent pas d'e-mail.

3. **Stocker les photos à part** (recommandé) : SQL Editor → coller `supabase/photos.sql` → Run. Les photos des comptes vont alors dans un espace privé (liens signés), au lieu d'alourdir les données : synchronisation plus rapide. Les photos existantes y sont déplacées automatiquement.
4. **Activer la recherche par photo** (Google Lens) : SQL Editor → New query → coller le contenu de `supabase/storage.sql` → Run. Ça crée l'espace de stockage `lens`, avec une photo par compte, remplacée à chaque recherche.

## Correspondances web (Google Shopping + eBay), gratuites

La fiche d'une pièce propose « Correspondances sur le web » : des produits ressemblants trouvés sur Google Shopping (via Bright Data) et eBay France, à partir du type, de la couleur et de la marque. Les clés restent dans Supabase, jamais dans l'app. Chaque compte a 20 recherches par jour, et une recherche déjà faite (moins de 7 jours) est resservie depuis le cache sans rien consommer.

1. **Quota et cache** : SQL Editor → coller `supabase/match.sql` → Run.
2. **Bright Data (Google Shopping, 5 000 requêtes par mois offertes, sans carte)** : créer un compte sur brightdata.com → *Add* → *SERP API* → nommer la zone (par ex. `serp_cintre`) → dans l'onglet *Overview* de la zone, copier la clé API.
3. **eBay (5 000 appels par jour offerts)** : créer un compte sur developer.ebay.com → *Application Keys* → créer un jeu de clés **Production** → copier *App ID (Client ID)* et *Cert ID (Client Secret)*. Si eBay demande la procédure « Marketplace Account Deletion », choisir l'exemption (l'app ne stocke aucune donnée d'utilisateur eBay).
4. **Secrets** : Supabase → *Edge Functions* → *Secrets* → ajouter `BRIGHTDATA_API_KEY`, `BRIGHTDATA_ZONE`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` (et, si besoin, `MATCH_DAILY_LIMIT`).
5. **Fonction** : *Edge Functions* → *Deploy a new function* → *Via Editor* → nom `match` → coller le contenu de `supabase/functions/match/index.ts` → *Deploy*.

Un seul des deux fournisseurs suffit : sans ses secrets, il est ignoré.

## Maintenance

Après une modification, augmente `VERSION` dans `sw.js` pour que les téléphones où l'app est installée reçoivent la nouvelle version.
