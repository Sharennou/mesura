# Vérifications

## Automatisé

Les données sont fictives et les tests d’API utilisent une base temporaire supprimée à la fin.

Validation de cette livraison : compilation de production réussie, **55 tests de calculs / API** et **4 parcours Playwright** réussis, avec contrôles axe sur les écrans parcourus à 390 et 360 px.

- Point / virgule, valeurs manquantes ou invalides, précision et affichage.
- IMC, ratios d’une même entrée, stature historique et divisions par zéro.
- Objectifs croissants, décroissants, maintien, bornes et projections insuffisantes / incohérentes.
- Agrégation journalière, durées différentes, absences et série de semaines.
- Fuseaux, heure d’hiver / printemps, quinze jours calendaires et règle mensuelle absente.
- Isolation de deux comptes pour entrées, images, mesures, objectifs, rappels, appareils, exports et tâches.
- Rejet d’une origine tierce et d’une mutation sans protection.
- Idempotence ; vrai décodage des photos, EXIF retiré et absence de sauvegarde si le fichier est invalide.
- Retrait effectif, effacement, vérification du mot de passe et révocation des sessions.
- Déduplication du worker, contrôle du consentement à l’envoi, expiration d’abonnement et texte discret.
- Ledger sur compte restauré et purge d’inactivité.
- Playwright à 390 × 844 et 360 × 800 : navigation, débordements, axe WCAG, compte / vérification, saisie, sauvegarde, rechargement, correction, note comme texte, photo, export et suppression.

Captures et traces sont dans `test-results/`, ignoré par Git. Les contrôles axe ne remplacent pas une revue humaine et un lecteur d’écran.

## Appareils et configuration réelle

| Situation                   | À vérifier après configuration                                                     |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Android                     | Installation, permission, livraison réelle, clic et écran verrouillé discret       |
| iPhone / iPad               | Ajout via Safari à l’accueil, lancement autonome et permission depuis un clic      |
| Refus / indisponibilité     | État réel, suivi disponible et absence d’activation email automatique              |
| Deux appareils              | Abonnements distincts et retrait depuis l’autre appareil                           |
| Changement de compte        | Aucun transfert silencieux de l’abonnement de l’appareil                           |
| Désactivation / suppression | Arrêt des futurs rappels et révocation des accès                                   |
| Fuseau / changement d’heure | Dates correctes et une seule occurrence                                            |
| Clavier mobile              | Champ visible, validation accessible et barre fixe retirée pendant la saisie       |
| VoiceOver / TalkBack        | Lecture, erreurs, focus, graphique et comparaison photo                            |
| Zoom / grandes polices      | Absence de coupure à 360 px et davantage                                           |
| Hors connexion              | Pas de faux succès, champs conservés et réessai                                    |
| SMTP                        | Vérification, récupération, sessions révoquées au reset et rappel choisi           |
| Infrastructure              | Chiffrement réel, stockage privé, sauvegarde cohérente et restauration avec ledger |

Docker, email externe et réception Web Push sur téléphone ne sont pas déclarés vérifiés dans cette livraison. Les envois de tests sont simulés.
