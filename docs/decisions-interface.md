# Décisions d’interface validées

État au 6 octobre 2026. Ces décisions résultent des demandes du propriétaire. Elles servent à éviter de réintroduire des éléments retirés.

## Identité visuelle

Les accents ont été légèrement adoucis : vert `#D3F653` et bleu `#434FED`. Appliquer cette palette aux surfaces et accents sans baisser l’opacité des textes.

Conserver l’interface mobile existante : police Archivo locale, palette centralisée, contours et ombres sans flou. Tous les textes visibles sont en français. Le logo fourni est conservé dans `src/assets/mesura-logo.png`.

Le nom textuel est centralisé dans `shared/config.ts` ; le logo contient aussi le nom et doit être remplacé séparément lors d’un changement de marque.

## Textes et éléments retirés

| Écran                          | Décision                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Création de compte / connexion | Retirer la carte « Des repères pour vous. Un suivi qui vous appartient. » et le parcours de confirmation d’email.                                                             |
| Mesures                        | Retirer « Votre repère du jour », « Chaque saisie compte. Gardez votre rythme. » et « Trois angles. Une évolution qui vous appartient. ».                                     |
| Analyse                        | Retirer « Votre évolution · chaque repère compte ». Remplacer « Votre cap personnel » par « Vos objectifs ».                                                                  |
| Analyse                        | Retirer « Comprendre ces calculs » et le bloc déroulant « Consulter les données du graphique », avec son tableau de moyennes journalières.                                    |
| Mon espace                     | Retirer le sous-titre « Tout commence par vous ». Employer « Pseudo » et « Hauteur » dans l’édition du profil ; afficher d’abord un menu. Retirer le champ du fuseau horaire. |
| Rappel                         | Retirer « Gardez le rythme · votre rendez-vous » et « Un moment pour vous ». Retirer la section « À quel rythme ? ».                                                          |

Le bloc de données du graphique était situé dans `Analysis.tsx`, même si la demande le nommait « page mesure ». Les moyennes utilisées par les courbes n’ont pas été supprimées.

## Mesures, guide et favoris

Placer l’historique en bas de Mesures. Garder les schémas, trois étapes courtes et les sources dans le guide. Retirer « À éviter » et « Bien mesurer à chaque séance ». Remplacer les flèches d’ordre des favoris par des poignées de glisser-déposer utilisables à la souris, au doigt et au clavier.

## Photos retirées

Retirer ajout de photos, galerie, comparaison, avatar et options associées. Les anciens fichiers restent privés et le nettoyage lié au retrait du suivi et à la suppression du compte reste compatible. Ne pas réintroduire les photos.

## Rappels

Rythme hebdomadaire fixe. Boutons de jours à sélection multiple, au moins un jour, état sélectionné accessible avec `aria-pressed`. Ne pas réintroduire les options « 15 jours » et « Mois » dans le formulaire.

## Manière de travailler

Privilégier les changements précis demandés, conserver le design existant et avancer sur les décisions courantes. Ne pas réintroduire de données fictives ou un accès sans compte. Vérifier les changements avant publication et signaler distinctement une fonctionnalité préparée, déployée ou testée réellement sur téléphone.

## Parcours mobiles corrigés (développement)

Les nouvelles instructions du propriétaire précisent les noms « Historique des mesures », « Comparer deux périodes » et « Bilan mensuel ». L’historique appartient à Mesures. La carte de poids reste reconnaissable, avec un état vide compact et un champ délimité. Les anciennes valeurs sont des textes de repère distincts de la saisie. Les détails d’analyse sont repliés ; aucune projection ou courbe vide n’est ajoutée pour remplir l’écran. Les hausses et baisses restent descriptives et neutres.

Les écrans de consultation et de modification d’une entrée sont distincts. Les retours et les deux types de brouillons conservent le contexte en mémoire de session. Aucun accueil intermédiaire, nouveau canal ou changement de technologie n’est introduit. Voir [le compte rendu UX](ux-parcours.md).

Demandes suivantes pour Mesures : retirer « Ajouter d’autres mensurations » en conservant « Personnaliser » ; ajouter juste sous les favorites un [guide illustré précis pour chaque mensuration](guide-mensurations.md). Le guide s’ouvre à la demande et garde le choix de mensuration pendant la navigation. Aucun repère anatomique n’est inventé pour les mesures personnalisées.
