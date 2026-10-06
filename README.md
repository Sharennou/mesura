# Mesura

Application web mobile de suivi corporel, en français. Deux destinations : **Mesures** et **Analyse**. Archivo variable locale, neuf couleurs centralisées, contours de 2 px et ombres sans flou.

## Publication gratuite : GitHub Pages et Supabase

Le workflow GitHub compile React puis publie uniquement `dist/` à l’adresse **https://sharennou.github.io/mesura/**. La page vide venait de la publication du fichier TypeScript source sans compilation et de chemins sans le préfixe `/mesura/`.

Les comptes et mesures privées utilisent le projet Supabase Free fourni par le propriétaire. Les paramètres publics sont centralisés dans `shared/cloud-config.ts`. Les secrets restent dans Supabase. La version locale Fastify / SQLite reste disponible.

1. Installer toutes les migrations du dossier `supabase/migrations/` dans Supabase.
2. Déployer la fonction `mesura-api` avec vérification JWT de la passerelle désactivée : la fonction vérifie elle-même chaque utilisateur et sa session. `npm run bundle:cloud` prépare aussi un fichier autonome pour l’éditeur Supabase.
3. Supabase Auth : définir l’URL du site et les URLs de retour sur `https://sharennou.github.io/mesura/`, désactiver « Confirm email » et définir le minimum de mot de passe à six caractères. Le SMTP sert à la récupération de mot de passe ; Brevo est configuré pour Auth.
4. Dans GitHub, choisir « Settings → Pages → Source → GitHub Actions », puis pousser sur `main`. Le workflow « Publier Mesura sur GitHub Pages » lance les contrôles et le déploiement.

Voir le [guide complet](docs/deploiement.md) pour les instructions exactes et les rappels. L’offre gratuite comporte des quotas et peut mettre un projet en pause après une semaine sans activité. Elle ne fournit pas de sauvegardes automatiques. Les comptes et mesures sont conservés dans Supabase, indépendamment d’un redéploiement GitHub.

## Lancement local

Node.js **24 LTS** et npm sont nécessaires.

```sh
npm ci
cp .env.example .env
npm run dev
```

Ouvrir **http://localhost:5173**. L’API écoute sur le port 3001. La base SQLite persiste dans `data/`, même après redémarrage. Secrets et données privées sont ignorés par Git.

Dans cet espace, un Node 24 vérifié par SHA-256 est aussi disponible dans `.runtime/`. Si votre terminal n’a pas Node :

```sh
export PATH="$PWD/$(cat .runtime/node-path):$PATH"
npm run dev
```

## Essayer un vrai compte

1. L’accueil impose la création d’un compte ou la connexion. Aucun écran de suivi n’est accessible sans connexion, y compris par lien direct.
2. Créer un compte : la session s’ouvre immédiatement, sans email de confirmation. Ou se connecter à son compte existant.
3. Le SMTP reste utilisé pour la récupération du mot de passe et les rappels facultatifs.
4. Après l’inscription, renseigner sa taille, choisir une cible ou le suivi sans cible et cocher une seule autorisation sur l’écran de démarrage. Le tout est sauvegardé ensemble ; cet écran ne revient pas après sa validation.
5. Enregistrer une mesure ou une note, puis consulter l’analyse.

Les nouveaux comptes commencent sans mesure ni note. Leur taille et leur éventuel objectif viennent du formulaire de démarrage. Les rappels sont autorisés au moment de leur activation ; les choix restent indépendants et modifiables en une action dans « Données et confidentialité ». Le mode découverte et ses données fictives ont été supprimés. Une ancienne valeur personnelle est affichée séparément comme repère ; les champs de nouvelle mesure restent vides. Le serveur bloque toute collecte sans consentement et n’annonce la réussite qu’après une sauvegarde réelle.

## Fonctionnalités

- Comptes Better Auth : inscription avec session immédiate, connexion, récupération, déconnexion et révocation des autres sessions.
- Poids, 14 mensurations standard, mesures personnalisées, favoris ordonnés par glisser-déposer et archivage avec historique.
- Notes privées ; guide illustré avec trois étapes courtes et sources.
- Historique, modification, correction explicite de la stature historique et suppression.
- Courbes réelles, sélection de plusieurs mesures, quatre périodes à partir de trois mois et moyennes journalières. IMC et ratios visibles sous le graphique.
- IMC, ratios, objectifs dans les deux directions ou de maintien et projection conditionnelle.
- Comparaison de périodes, bilan mensuel recalculé et notes du mois.
- PWA, Web Push et email facultatif ; rappels hebdomadaires sur un ou plusieurs jours.
- Consentements versionnés, export JSON / CSV / ZIP, retrait effectif et suppression avec identité vérifiée.
- Purge d’inactivité et ledger indépendant empêchant la réactivation d’un compte après restauration.

## Vérification

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Les tests couvrent les calculs, calendriers, deux comptes isolés, rejet des envois de fichiers, nettoyage des anciennes photos et tâches de fond. Playwright vérifie les écrans à 390 et 360 px, les contrôles axe et le parcours d’un vrai compte. Les livraisons push sont simulées dans les tests, sans envoi à un appareil.

## Architecture et documentation

Lire [le contexte de l’application](CONTEXTE.md) pour reprendre le projet et retrouver les décisions validées.

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

Le fuseau horaire reste géré automatiquement pour les rappels, sans champ à renseigner.

Les rappels hebdomadaires acceptent plusieurs jours, à une heure commune. L’aperçu et les tâches d’envoi utilisent la même règle. Les anciens rappels à un seul jour sont repris automatiquement. Le rythme proposé est toujours hebdomadaire ; réenregistrer un ancien rappel le convertit à ce rythme.

## Parcours mobiles — version de développement

La refonte du parcours conserve la technologie, les données et l’identité visuelle. Mesures donne accès à l’historique en bas de page et conserve les brouillons pendant la navigation. L’Analyse adapte ses résultats aux données et rapproche les outils de comparaison. Les entrées ont un détail distinct de leur édition ; les retours restaurent le contexte. Mon espace commence par un menu, et les rappels distinguent horaires enregistrés et appareil configuré.

Voir [le diagnostic, les changements et la validation](docs/ux-parcours.md). Le script `scripts/ux-preview.ts` prépare uniquement des comptes fictifs sur un serveur **local de développement**, sans réinitialiser de données. Les changements de cette session ne sont pas publiés.

Les photos associées aux mesures ont été retirées le 6 octobre 2026 : ajout aux mesures, galerie, comparaison, consentement proposé et inclusion dans les exports ZIP. Les API refusent les nouveaux envois de photos de mesures. Les anciens fichiers et champs restent privés et compatibles avec le nettoyage lors du retrait du suivi ou de la suppression du compte ; aucune migration destructive n’est appliquée.

La photo de profil est conservée : ajout, remplacement et retrait dans « Profil », avec affichage rond dans l’en-tête. Elle est réduite en JPEG sans métadonnées et enregistrée dans le profil privé.

## Compte de développement rempli

`npm run seed:dev` crée un compte explicitement nommé « Développement · données fictives » sur le serveur local (`http://127.0.0.1:5173`). Pour l’application en ligne, utiliser explicitement `npm run seed:dev -- --target cloud`. Le script utilise uniquement les API publiques authentifiées, sans clé d’administration.

Le jeu contient 30 entrées et 383 valeurs sur plus d’un an : 15 types de mesures, séances partielles, notes, note seule, deux mesures du même jour et objectif de poids. `--dry-run` affiche uniquement le résumé sans créer de compte. Les identifiants générés sont conservés dans un fichier privé ignoré par Git, `.runtime/development-account-local.json` ou `.runtime/development-account-cloud.json` ; les relances reprennent le même compte et complètent seulement les entrées manquantes. Les comptes ordinaires restent vides à leur création.

### Outils corporels

IMC, adiposité abdominale selon NICE, taille/hanches, RFM et dépense au repos Mifflin–St Jeor : [formules, sources, éligibilité et migration](docs/outils-scientifiques.md). Les résultats sont calculés localement à partir d’une séance traçable ; les données anciennes sans protocole restent conservées.
