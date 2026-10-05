# Mesura

Application web mobile de suivi corporel, en français. Deux destinations : **Mesures** et **Analyse**. Archivo variable locale, neuf couleurs centralisées, contours de 2 px et ombres sans flou.

## Publication gratuite : GitHub Pages et Supabase

Le workflow GitHub compile React puis publie uniquement `dist/` à l’adresse **https://sharennou.github.io/mesura/**. La page vide venait de la publication du fichier TypeScript source sans compilation et de chemins sans le préfixe `/mesura/`.

Les comptes, mesures et photos privées utilisent le projet Supabase Free fourni par le propriétaire. Les paramètres publics sont centralisés dans `shared/cloud-config.ts`. Les secrets restent dans Supabase. La version locale Fastify / SQLite reste disponible.

1. Installer les deux migrations du dossier `supabase/migrations/` dans Supabase.
2. Déployer la fonction `mesura-api` avec vérification JWT de la passerelle désactivée : la fonction vérifie elle-même chaque utilisateur et sa session. `npm run bundle:cloud` prépare aussi un fichier autonome pour l’éditeur Supabase.
3. Supabase Auth : définir l’URL du site et les URLs de retour sur `https://sharennou.github.io/mesura/`, puis configurer les emails de confirmation. Le mailer Supabase par défaut est limité aux membres du projet ; un SMTP gratuit configuré est nécessaire pour ouvrir l’inscription à d’autres utilisateurs.
4. Dans GitHub, choisir « Settings → Pages → Source → GitHub Actions », puis pousser sur `main`. Le workflow « Publier Mesura sur GitHub Pages » lance les contrôles et le déploiement.

Voir le [guide complet](docs/deploiement.md) pour les instructions exactes et les rappels. L’offre gratuite comporte des quotas et peut mettre un projet en pause après une semaine sans activité. Elle ne fournit pas de sauvegardes automatiques. Les comptes et photos sont conservés dans Supabase, indépendamment d’un redéploiement GitHub.

## Lancement local

Node.js **24 LTS** et npm sont nécessaires.

```sh
npm ci
cp .env.example .env
npm run dev
```

Ouvrir **http://localhost:5173**. L’API écoute sur le port 3001. La base SQLite et les photos persistent dans `data/`, même après redémarrage. Secrets et données privées sont ignorés par Git.

Dans cet espace, un Node 24 vérifié par SHA-256 est aussi disponible dans `.runtime/`. Si votre terminal n’a pas Node :

```sh
export PATH="$PWD/$(cat .runtime/node-path):$PATH"
npm run dev
```

## Essayer un vrai compte

1. L’accueil impose la création d’un compte ou la connexion. Aucun écran de suivi n’est accessible sans connexion, y compris par lien direct.
2. Créer un compte : la session s’ouvre immédiatement, sans email de confirmation. Ou se connecter à son compte existant.
3. Le SMTP reste utilisé pour la récupération du mot de passe et les rappels facultatifs.
4. Après l’inscription, Renseigner sa taille, choisir une cible ou le suivi sans cible et cocher une seule autorisation sur l’écran de démarrage. Le tout est sauvegardé ensemble ; cet écran ne revient pas après sa validation.
5. Enregistrer une mesure, une note ou une photo, puis consulter l’analyse.

Les nouveaux comptes commencent sans mesure, note ni photo. Leur taille et leur éventuel objectif viennent du formulaire de démarrage. Les photos et les rappels sont autorisés au moment de leur activation ; les choix restent indépendants et modifiables en une action dans « Données et confidentialité ». Le mode découverte et ses données fictives ont été supprimés. Une ancienne valeur personnelle est seulement un placeholder. Le serveur bloque toute collecte sans consentement et n’annonce la réussite qu’après une sauvegarde réelle. Un fichier invalide empêche la sauvegarde complète, sans perdre les champs.

## Fonctionnalités

- Comptes Better Auth : inscription avec session immédiate, connexion, récupération, déconnexion et révocation des autres sessions.
- Poids, 14 mensurations standard, mesures personnalisées, favoris ordonnés et archivage avec historique.
- Notes privées et photos Face / Profil / Dos ; galerie et comparaison accessible, sans recadrage.
- Historique, modification, correction explicite de la stature historique et suppression.
- Courbes réelles, cinq périodes, moyennes journalières et alternative textuelle.
- IMC, ratios, objectifs dans les deux directions ou de maintien et projection conditionnelle.
- Comparaison de périodes, bilan mensuel recalculé et notes du mois.
- PWA, Web Push et email facultatif ; rythmes hebdomadaire, **15 jours calendaires** et mensuel.
- Consentements versionnés, export JSON / CSV / ZIP, retrait effectif et suppression avec identité vérifiée.
- Purge d’inactivité et ledger indépendant empêchant la réactivation d’un compte après restauration.

## Vérification

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Les tests couvrent les calculs, calendriers, deux comptes isolés, photos et tâches de fond. Playwright vérifie les écrans à 390 et 360 px, les contrôles axe et le parcours d’un vrai compte. Les livraisons push sont simulées dans les tests, sans envoi à un appareil.

## Architecture et documentation

React / TypeScript / Vite, Fastify, SQLite WAL, Better Auth, Sharp, Luxon et Web Push. Les versions sont figées par le lockfile. Le nom est centralisé dans **`shared/config.ts`** ; les icônes et le manifest sont régénérés avant lancement et compilation. Le logo fourni est conservé dans `src/assets/mesura-logo.png` et affiché dans l’en-tête de tous les écrans. Lors d’un changement de nom, remplacer aussi ce fichier puisqu’il contient le texte Mesura.

- [Architecture, modèle et règles d’accès](docs/architecture.md)
- [Calculs et conventions](docs/calculs.md)
- [Exploitation et configuration](docs/exploitation.md)
- [Confidentialité et documents à compléter](docs/confidentialite.md)
- [Vérifications et essais sur appareils](docs/verification.md)

La production exige HTTPS, secret d’authentification, SMTP, stockage persistant protégé, sauvegardes et informations de l’exploitant. Les clés VAPID rendent les notifications disponibles. Sans service configuré, l’interface montre l’état réel du canal.

## Hypothèses

Le texte joint annonce neuf couleurs sans leur tableau de codes. Encre `#0C0C10` et cobalt `#2D3CFF` sont conservés ; les sept autres couleurs, dont volt `#D7FF3F`, sont centralisées dans `src/styles.css`. La liste détaillée des entités annoncée dans le texte est également absente : le modèle choisi est documenté.

Les essais sur téléphones, la configuration des prestataires et la validation juridique sont détaillés dans les documents. Cette livraison ne prétend pas valider ces paramètres externes.
