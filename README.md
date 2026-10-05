# Mesura

Application web mobile de suivi corporel, en français. Deux destinations : **Mesures** et **Analyse**. Archivo variable locale, neuf couleurs centralisées, contours de 2 px et ombres sans flou.

## Lancement

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

1. L’accueil propose un **aperçu clairement fictif** ; ses valeurs ne sont jamais copiées dans un nouveau compte.
2. Ouvrir « Mon espace », créer un compte et vérifier l’email.
3. Sans SMTP, la messagerie **locale de développement** propose le lien de test. Aucun email n’est annoncé comme envoyé.
4. Choisir séparément les consentements dans « Données et confidentialité ».
5. Enregistrer une mesure, une note ou une photo, puis consulter l’analyse.

Les champs d’un compte réel sont vides. Une ancienne valeur est seulement un placeholder. Le serveur bloque toute collecte sans consentement et n’annonce la réussite qu’après une sauvegarde réelle. Un fichier invalide empêche la sauvegarde complète, sans perdre les champs.

## Fonctionnalités

- Comptes Better Auth : vérification, connexion, récupération, déconnexion et révocation des autres sessions.
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

React / TypeScript / Vite, Fastify, SQLite WAL, Better Auth, Sharp, Luxon et Web Push. Les versions sont figées par le lockfile. Le nom est centralisé dans **`shared/config.ts`** ; les icônes et le manifest sont régénérés avant lancement et compilation.

- [Architecture, modèle et règles d’accès](docs/architecture.md)
- [Calculs et conventions](docs/calculs.md)
- [Exploitation et configuration](docs/exploitation.md)
- [Confidentialité et documents à compléter](docs/confidentialite.md)
- [Vérifications et essais sur appareils](docs/verification.md)

La production exige HTTPS, secret d’authentification, SMTP, stockage persistant protégé, sauvegardes et informations de l’exploitant. Les clés VAPID rendent les notifications disponibles. Sans service configuré, l’interface montre l’état réel du canal.

## Hypothèses

Le texte joint annonce neuf couleurs sans leur tableau de codes. Encre `#0C0C10` et cobalt `#2D3CFF` sont conservés ; les sept autres couleurs, dont volt `#D7FF3F`, sont centralisées dans `src/styles.css`. La liste détaillée des entités annoncée dans le texte est également absente : le modèle choisi est documenté.

Les essais sur téléphones, la configuration des prestataires et la validation juridique sont détaillés dans les documents. Cette livraison ne prétend pas valider ces paramètres externes.
