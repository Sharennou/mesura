# Décisions d’interface validées

État au 5 octobre 2026. Ces décisions résultent des demandes du propriétaire. Elles servent à éviter de réintroduire des éléments retirés.

## Identité visuelle

Les accents ont été légèrement adoucis : vert `#D3F653` et bleu `#434FED`. Appliquer cette palette aux surfaces et accents sans baisser l’opacité des textes ou des photos.

Conserver l’interface mobile existante : police Archivo locale, palette centralisée, contours et ombres sans flou. Tous les textes visibles sont en français. Le logo fourni est conservé dans `src/assets/mesura-logo.png`.

Le nom textuel est centralisé dans `shared/config.ts` ; le logo contient aussi le nom et doit être remplacé séparément lors d’un changement de marque.

## Textes et éléments retirés

| Écran                          | Décision                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Création de compte / connexion | Retirer la carte « Des repères pour vous. Un suivi qui vous appartient. » et le parcours de confirmation d’email.                          |
| Mesures                        | Retirer « Votre repère du jour », « Chaque saisie compte. Gardez votre rythme. » et « Trois angles. Une évolution qui vous appartient. ».  |
| Analyse                        | Retirer « Votre évolution · chaque repère compte ». Remplacer « Votre cap personnel » par « Vos objectifs ».                               |
| Analyse                        | Retirer « Comprendre ces calculs » et le bloc déroulant « Consulter les données du graphique », avec son tableau de moyennes journalières. |
| Mon espace                     | Retirer le sous-titre « Tout commence par vous ». Employer « Pseudo » et « Taille ». Retirer le champ du fuseau horaire.                   |
| Rappel                         | Retirer « Gardez le rythme · votre rendez-vous » et « Un moment pour vous ». Retirer la section « À quel rythme ? ».                       |

Le bloc de données du graphique était situé dans `Analysis.tsx`, même si la demande le nommait « page mesure ». Les moyennes utilisées par les courbes n’ont pas été supprimées.

## Photo de profil

Afficher uniquement la photo dans un cercle rempli, sans fond noir ni bordure. Ce comportement concerne Mon espace et le bouton de compte en haut à droite. Garder le bouton accessible par son libellé et l’icône de personnage en l’absence de photo. Préserver l’isolation entre comptes lors du chargement.

## Rappels

Rythme hebdomadaire fixe. Boutons de jours à sélection multiple, au moins un jour, état sélectionné accessible avec `aria-pressed`. Ne pas réintroduire les options « 15 jours » et « Mois » dans le formulaire.

## Manière de travailler

Privilégier les changements précis demandés, conserver le design existant et avancer sur les décisions courantes. Ne pas réintroduire de données fictives ou un accès sans compte. Vérifier les changements avant publication et signaler distinctement une fonctionnalité préparée, déployée ou testée réellement sur téléphone.
