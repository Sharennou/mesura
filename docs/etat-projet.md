# État technique et reprise du travail

État au 6 octobre 2026 ; dernière évolution fonctionnelle publiée : `860762e`, rappels hebdomadaires fixes.

## Déploiement actuel

| Élément            | État                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Dépôt              | `Sharennou/mesura`, branche `main`                                                           |
| Interface          | https://sharennou.github.io/mesura/                                                          |
| API cloud          | Projet Supabase `duselqsuvkwbwkhmljkh`, fonction `mesura-api`                                |
| Authentification   | Supabase Auth, confirmation email désactivée, mot de passe minimum six caractères            |
| Emails Auth        | SMTP Brevo configuré ; une IP de connexion SMTP a été autorisée après un rejet               |
| Données            | Postgres, compte JSON privé, contrôles RLS et sessions actives                               |
| Photos d’évolution | Fonction retirée ; anciennes données privées et nettoyage conservés                          |
| Notifications      | Web Push, clés VAPID dans Vault, planificateur serveur                                       |
| Publication        | GitHub Actions pour Pages ; intégration Supabase sur `main` pour migrations et fonction Edge |

Le service SMTP Auth Brevo ne configure pas automatiquement les rappels email de la fonction Edge. Leur configuration est décrite dans [deploiement.md](deploiement.md). Les offres gratuites ont des quotas ; aucune gratuité à vie ni disponibilité sans panne n’est garantie. Supabase Free peut mettre en pause les projets inactifs. Ne pas présenter une validation automatique comme une preuve de réception effective d’email ou de notification.

## Organisation du code

| Chemin                                           | Responsabilité                                         |
| ------------------------------------------------ | ------------------------------------------------------ |
| `src/App.tsx`                                    | Session, accès aux écrans, démarrage et navigation     |
| `src/screens/Account.tsx`                        | Inscription, connexion et récupération                 |
| `src/screens/OnboardingScreen.tsx`               | Hauteur, âge, sexe des équations et objectif après inscription |
| `src/screens/Measure.tsx`, `Analysis.tsx`        | Mesures et analyse                                     |
| `src/screens/ProfileScreen.tsx`                  | Pseudo, hauteur, âge, sexe des équations et photo de profil |
| `src/screens/Reminder.tsx`                       | Jours hebdomadaires, heure et canal                    |
| `src/api.ts`, `src/cloud-auth.ts`                | Adaptation entre API locale et cloud                   |
| `shared/config.ts`, `shared/types.ts`            | Nom, consentements, constantes et contrats             |
| `shared/calculations.ts`, `shared/recurrence.ts` | Calculs et calendrier partagé entre affichage et envoi |
| `shared/cloud-domain.ts`                         | Mutations cloud et validation des données              |
| `server/`                                        | Version native Fastify / Better Auth / SQLite          |
| `supabase/functions/mesura-api/index.ts`         | API et tâches Edge                                     |
| `.github/workflows/pages.yml`                    | Compilation et publication du bundle                   |

Les paramètres publics sont dans `shared/cloud-config.ts`. Ne pas ajouter de secret dans cette documentation, dans les sources frontend ou dans Git.

## Migrations

- Supabase : les quatre fichiers de `supabase/migrations/`, dans l’ordre numérique ; le dernier retire la condition de confirmation d’email des contrôles SQL de session.
- Local : migrations Better Auth, puis les six fichiers de `server/migrations/`. `004_avatar.sql` garde la colonne de photo de profil privée ; `005_reminder_days.sql` ajoute les jours multiples.
- L’avatar cloud et les jours multiples sont dans le JSON privé du compte ; aucune colonne Postgres supplémentaire n’était nécessaire.
- Préserver les données réelles et les journaux de suppression. Ne jamais réinitialiser le projet de production pour tester.

## Commandes

Node 24 est requis. Si nécessaire dans cet espace :

```sh
export PATH="$PWD/$(cat .runtime/node-path):$PATH"
```

```sh
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
npm run check:cloud
```

Les tests mobiles utilisent un serveur et une base temporaires distincts pour chaque format, afin de ne pas cumuler leurs appels dans le quota d’une même minute. Ils ne réutilisent pas les données de l’utilisateur.

Pour contrôler le bundle cloud :

```sh
VITE_BASE_PATH=/mesura/ VITE_DEPLOYMENT=supabase npm run build
npm run test:pages
```

Le préfixe `/mesura/` est indispensable sur GitHub Pages. Ne pas publier directement `index.html` source. Les scripts de compilation régénèrent certains fichiers publics ; distinguer ces sorties automatiques des changements voulus avant un commit.

## Vérification et limites connues

La validation locale du 6 octobre 2026 comprend 81 tests unitaires / API / SQL et 22 parcours mobiles, à 390 et 360 px. Elle couvre notamment les favoris à la souris, au doigt et au clavier, l’ordre sauvegardé, le guide simplifié, l’absence des contrôles photo et le nettoyage des anciennes données. Ces modifications ne sont pas publiées.

Les callbacks Auth cloud sont aussi testés avec des réponses simulées. Un véritable parcours multiutilisateur cloud et la réception des notifications sur les téléphones cibles restent à vérifier ; les tests de livraison sont simulés. Les coordonnées et documents de l’exploitant restent à compléter selon [confidentialite.md](confidentialite.md). Les sauvegardes externes doivent être organisées : la formule Free ne fournit pas la sauvegarde automatique attendue.

## Reprise d’une tâche

1. Lire [CONTEXTE.md](../CONTEXTE.md), les décisions d’interface et le fichier concerné.
2. Consulter `git status` et préserver les modifications déjà présentes.
3. Vérifier les deux implémentations si un contrat de données change : locale et cloud.
4. Effectuer les contrôles adaptés à la modification, sans envois réels ni effacement de données personnelles pour tester.
5. Pour une publication autorisée, envoyer sur `main` et vérifier la réussite de GitHub Pages et de Supabase.
6. Mettre à jour ce contexte si une décision, un écran ou un réglage de déploiement change.

## Refonte UX du 5 octobre 2026 — développement, non publiée

Les parcours mobiles sont corrigés sans changement de technologie, de modèle de données ou de backend. Voir [le diagnostic et le détail par écran](ux-parcours.md). Les nouvelles routes internes `entry`, `edit` et `profile` séparent consultation, modification et menu du compte. `src/useViewState.ts` conserve les choix d’écran en mémoire ; les brouillons de nouvelle mesure et d’édition restent indépendants et conservent leurs fichiers pendant les changements d’écran.

Validation de cette refonte, avant l’ajout des Outils : compilations locale et cloud, 83 tests unitaires/API/cloud/SQL, 16 parcours mobiles à 390 × 844 et 360 × 800, axe et cibles tactiles, checks des chemins GitHub Pages et callbacks Auth simulés. Les tests de notifications utilisent un appareil simulé. L’essai sur vrais téléphones et la réception effective restent nécessaires.

Prévisualisation locale séparée : `http://127.0.0.1:5182`, base `.runtime/ux-preview/`. Le script `scripts/ux-preview.ts` prépare des comptes fictifs uniquement sur un hôte local en développement. Aucun déploiement n’a été effectué pendant cette session. Les tests Playwright attendent maintenant que `/api/config` soit prêt, pour ne pas confondre une API encore au démarrage avec une régression du parcours.

## Outils — implémentation non publiée

« Outils » remplace « IMC et ratios » dans Analyse. Les séances conservent l’âge calculable, l’équation choisie, la situation, les deux protocoles de tour de taille et la provenance de la hauteur. La migration locale `006_body_tools.sql` est additive ; le compte JSON cloud reçoit le nouveau catalogue sans modifier les anciennes mesures.

Formules, restrictions et références : [dossier scientifique](outils-scientifiques.md). L’inscription et le profil exposent directement la naissance (âge calculé) et le sexe utilisé pour les équations, sans nouveau champ de stockage ni modification rétroactive des séances. Bilan : 150 tests unitaires/API/cloud/SQL, 24 exécutions de parcours mobiles, contrôles cloud et Pages réussis ; voir [vérifications](verification.md). Publier l’API avant le frontend. Aucune publication ni migration des données de production effectuée pendant cette évolution.
