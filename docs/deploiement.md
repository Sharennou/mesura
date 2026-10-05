# Publication gratuite de Mesura

## Architecture

GitHub Pages héberge le bundle React compilé. Supabase héberge Auth, Postgres et un bucket privé. Une fonction Edge applique les mêmes règles de consentement et de mesure que l’application locale. Aucun serveur payant ni disque Render n’est nécessaire. La clé `sb_publishable_…` est publique : elle ne donne pas accès aux données privées. Les contrôles RLS, la vérification des sessions et les restrictions des fonctions SQL sont obligatoires.

L’offre Supabase Free inclut actuellement 500 Mo de base, 1 Go de fichiers, 5 Go de trafic sortant et 500 000 appels de fonctions. Elle peut mettre les projets en pause après sept jours d’inactivité et n’inclut pas de sauvegardes automatiques. Conserver le plan **Free**, sans activer de services payants : [tarifs officiels](https://supabase.com/pricing).

## Installer Supabase

Projet : `duselqsuvkwbwkhmljkh`. Les paramètres publics sont dans `shared/cloud-config.ts`.

Avec le CLI Supabase, depuis un terminal déjà connecté au compte propriétaire :

```sh
npx supabase login
npx supabase link --project-ref duselqsuvkwbwkhmljkh
npx supabase db push
npx supabase functions deploy mesura-api --no-verify-jwt
```

Ou depuis le tableau de bord :

1. SQL Editor : exécuter dans l’ordre les fichiers de `supabase/migrations/` : `20261005000100_mesura.sql`, `20261005000200_jobs.sql`, puis `20261005000300_push.sql`. Ces migrations sont additives et ne suppriment aucune table existante. Elles créent les tables Mesura, le bucket privé, les contrôles de session, les transactions et le planificateur.
2. Exécuter `npm run bundle:cloud`. Edge Functions → nouvelle fonction `mesura-api` → coller `.runtime/mesura-api.ts` comme `index.ts` et déployer. Désactiver « Verify JWT » dans les réglages de la fonction. Ce réglage permet l’emploi des nouvelles clés publiques ; les opérations privées restent protégées par `Auth.getUser`, le contrôle de la session en base.
3. Vérifier `https://duselqsuvkwbwkhmljkh.supabase.co/functions/v1/mesura-api/health` : réponse `{"status":"ok"}`. Une requête anonyme à `/account` doit répondre 401, et la clé publique ne doit pouvoir lire aucune ligne de compte ni aucun fichier photo.

Le planificateur appelle la fonction toutes les minutes. Son secret est généré et conservé dans Supabase Vault. Il ne sort ni dans le dépôt ni dans le navigateur. La purge fonctionne même sans canal de notification configuré.

Le projet est également relié à `Sharennou/mesura` dans Settings → Integrations, avec « Deploy to production » activé sur `main`, dossier `.` et preview branches désactivées. Les prochains envois appliquent automatiquement les nouvelles migrations et déploient `mesura-api`, sans abonnement Pro.

## Auth et emails

Dans Authentication → URL Configuration :

- Site URL : `https://sharennou.github.io/mesura/`.
- Redirect URLs : `https://sharennou.github.io/mesura/` et `https://sharennou.github.io/mesura/?reset=1`.
- Conserver la confirmation email activée.
- Définir une longueur minimale de mot de passe de 6 caractères, comme `MIN_PASSWORD_LENGTH` dans `shared/config.ts`. Supabase hébergé refuse un minimum inférieur à 6 ([schéma officiel de configuration](https://raw.githubusercontent.com/supabase/supabase/master/apps/docs/spec/api_v1_openapi.json)).

Dans Auth → Sign In / Providers → Email, désactiver « Confirm email ». L’inscription ouvre immédiatement une session sans envoyer de confirmation. Configurer un SMTP pour les liens de récupération de mot de passe ; le SMTP Brevo est configuré dans le projet. Référence : [emails Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

L’application statique utilise les sessions Supabase avec renouvellement. La récupération du mot de passe conserve le flux email « implicit » : le SDK valide la session auprès d’Auth et nettoie les jetons du fragment de l’URL. Seuls les jetons d’authentification persistent dans le stockage du navigateur ; les mesures, notes et photos ne sont pas stockées dans localStorage ni dans le cache PWA. Le serveur valide aussi `session_id` dans `auth.sessions` : fermer une session lui retire immédiatement l’accès à l’API et à la lecture directe RLS. La version locale utilise des cookies HttpOnly Better Auth.

L’accueil impose la création de compte ou la connexion ; les écrans de suivi sont réservés aux comptes connectés. L’inscription ouvre directement l’écran de démarrage pour les comptes non configurés : taille, objectif (ou suivi sans cible) et une autorisation de suivi. `/onboarding` valide et sauvegarde ces informations ensemble dans une transaction SQLite ou une révision cloud. Le marqueur de fin est conservé dans le profil. Les comptes existants ayant déjà une taille ou des entrées n’ont pas à recommencer. Les autorisations photos et rappels restent facultatives et sont demandées à l’usage. Les conditions d’utilisation restent consultables depuis le formulaire d’inscription. Aucun mode découverte ni données corporelles de démonstration n’est proposé.

## GitHub Pages

Pousser les modifications avec GitHub Desktop (« Commit », puis « Push origin »). Dépôt → Settings → Pages → Source : **GitHub Actions**. Le workflow `.github/workflows/pages.yml` :

1. installe Node 24 et les dépendances figées ;
2. exécute les tests et le contrôle Deno ;
3. compile avec `VITE_DEPLOYMENT=supabase` et le préfixe de GitHub ;
4. publie seulement `dist/`.

URL : **https://sharennou.github.io/mesura/**. `index.html` source ne doit jamais être publié directement. Les chemins du manifest, des icônes, de la police, du service worker et des fichiers compilés respectent `/mesura/`. Les fragments `#analysis` fonctionnent après rechargement. Voir [la configuration Vite pour Pages](https://vite.dev/guide/static-deploy.html#github-pages).

Vérification locale :

```sh
VITE_BASE_PATH=/mesura/ VITE_DEPLOYMENT=supabase npm run build
npm run test:pages
npm run check:cloud
npm test
```

Le test de publication contrôle les chemins et l’interface sur 390 et 360 px ; son contrôle anonyme simule seulement la réponse publique `/config`. Un deuxième contrôle simule le retour de confirmation Auth, la récupération et les réponses de compte pour vérifier la session automatique et le démarrage dans le bundle compilé. Les transactions métier réelles, les conflits d’écriture et les autorisations SQL sont testés séparément (SQLite et Postgres embarqué PGlite). Un parcours complet en ligne avec email réel reste à vérifier avec une adresse email autorisée par le projet.

## Rappels et données

Web Push fonctionne sans fournisseur payant : la fonction crée une paire VAPID une seule fois, puis la conserve chiffrée dans Supabase Vault. Un verrou Postgres évite de créer deux paires au démarrage. Seule la clé publique est transmise au téléphone ; la clé privée reste accessible au serveur. Les secrets optionnels `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` permettent d’utiliser une paire existante. Conserver la paire et Vault lors d’une restauration pour préserver les abonnements. Sur iPhone, installer l’application sur l’écran d’accueil avant d’autoriser les notifications.

Pour les rappels email facultatifs : renseigner `RESEND_API_KEY` et `MAIL_FROM` autorisé par ce fournisseur dans **Edge Functions → Secrets**. Aucun rappel ne contient de mesure ni de note. `PRIVACY_CONTACT` renseigne le contact de l’exploitant. `MESURA_APP_URL` permet de changer l’URL publique sans toucher au code.

Un canal n’apparaît disponible que lorsque ses secrets sont configurés et que le planificateur a réellement appelé la fonction dans les trois dernières minutes. Les tâches réclament chaque occurrence en base avant l’envoi ; une même occurrence n’est pas renvoyée après un redémarrage. Un échec est enregistré et un endpoint expiré retiré.

Les photos JPEG / PNG / WebP sont orientées, réduites sans recadrage et dépouillées de métadonnées dans le navigateur, puis vérifiées, décodées et réencodées côté serveur. Les originaux ne sont pas conservés. Le bucket reste privé, même si d’autres buckets du projet possèdent des policies permissives. Un export ZIP cloud est limité à 20 Mo pour respecter la mémoire du service gratuit.

Les changements de compte sont validés avec une révision Postgres : un accord retiré pendant une sauvegarde bloque sa nouvelle tentative. Une file persistante efface les fichiers remplacés, retirés ou abandonnés après un crash. La suppression crée un tombstone avant l’effacement Auth. Le worker reapplique les suppressions ; une restauration ne réactive pas un compte dont le tombstone actuel est conservé.

Créer des sauvegardes cohérentes des données et des photos, conservées 30 jours maximum. Exporter aussi les tombstones dans une copie indépendante, et les réappliquer avant de rouvrir une restauration. La version Free ne fournit pas cette sauvegarde automatique. Ne pas restaurer un ancien journal de suppression à la place du journal actuel. Le modèle JSON par compte convient à cette version ; une évolution SaaS de grande taille peut normaliser les tables sans changer les écrans ni les règles métier partagées.

La migration `20261005000400_email_optional.sql` retire la condition de confirmation email des accès SQL tout en conservant la vérification de l’identité, de la session et des droits du propriétaire. Les comptes locaux sans email confirmé sont conservés selon la même durée d’inactivité de 24 mois que les autres comptes.
