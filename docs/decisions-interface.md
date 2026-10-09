# Décisions d’interface validées

État au 8 octobre 2026. Ces décisions résultent des demandes du propriétaire. Elles servent à éviter de réintroduire des éléments retirés.

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

Retirer ajout de photos aux mesures, galerie, comparaison et options associées. Conserver la photo de profil, son ajout, son retrait et son affichage rond dans l’en-tête. Les anciens fichiers restent privés et le nettoyage lié au retrait du suivi et à la suppression du compte reste compatible. Ne pas réintroduire les photos de mesures.

## Rappels

Rythme hebdomadaire fixe. Boutons de jours à sélection multiple, au moins un jour, état sélectionné accessible avec `aria-pressed`. Ne pas réintroduire les options « 15 jours » et « Mois » dans le formulaire.

## Manière de travailler

Privilégier les changements précis demandés, conserver le design existant et avancer sur les décisions courantes. Ne pas réintroduire de données fictives ou un accès sans compte. Vérifier les changements avant publication et signaler distinctement une fonctionnalité préparée, déployée ou testée réellement sur téléphone.

## Parcours mobiles corrigés (développement)

Les nouvelles instructions du propriétaire précisent les noms « Historique des mesures », « Comparer deux périodes » et « Bilan mensuel ». L’historique appartient à Mesures. La carte de poids reste reconnaissable, avec un état vide compact et un champ délimité. Les anciennes valeurs sont des textes de repère distincts de la saisie. L’IMC et les ratios sont affichés directement sous le graphique. Plusieurs mesures peuvent être sélectionnées ensemble, avec comparaison en pourcentage et valeurs exactes par date. Retirer « Les autres mesures » et la période 1M ; proposer 3M, 6M, 1A et MAX. Les objectifs restent repliés ; aucune projection ou courbe vide n’est ajoutée pour remplir l’écran. Les hausses et baisses restent descriptives et neutres.

Les écrans de consultation et de modification d’une entrée sont distincts. Les retours et les deux types de brouillons conservent le contexte en mémoire de session. Aucun accueil intermédiaire, nouveau canal ou changement de technologie n’est introduit. Voir [le compte rendu UX](ux-parcours.md).

Demandes suivantes pour Mesures : retirer « Ajouter d’autres mensurations » en conservant « Personnaliser » ; ajouter juste sous les favorites un [guide illustré précis pour chaque mensuration](guide-mensurations.md). Le guide s’ouvre à la demande et garde le choix de mensuration pendant la navigation. Aucun repère anatomique n’est inventé pour les mesures personnalisées.

## Outils — évolution du 6 octobre 2026

Décision initiale, remplacée par la simplification du 8 octobre ci-dessous : « Outils » remplaçait « IMC et ratios » avec « Comprendre le calcul » et « Sources et limites ». Les liens `#analysis` restent compatibles.

## Inscription et Mesures — évolution du 8 octobre 2026

L’inscription demande obligatoirement la hauteur, la naissance et le choix du sexe utilisé pour les calculs, puis l’objectif et le consentement. Après simplification demandée, retirer le titre « Données pour les outils », les textes d’aide et d’introduction, l’âge affiché, la situation actuelle, la date de mesure de la hauteur et les protocoles de l’inscription. Garder uniquement les libellés des questions, les champs et l’autorisation de suivi. Les renseignements complémentaires de hauteur et de protocole restent dans le profil ; aucune date de mesure n’est présumée.

Les nouveaux comptes affichent uniquement poids, tour de taille et hanches. Toute autre mesure s’ajoute dans « Personnaliser » les favoris. Le guide déroulant est conservé ; un lien « Guide » à droite de chaque mensuration ouvre directement la fiche correspondante, sans perdre le brouillon. Le poids ne possède ni lien ni fiche dans le guide.

## Analyse approfondie — simplification du 8 octobre 2026

Remplacer « Outils » par « Analyse approfondie ». Le sélecteur de séance affiche uniquement le jour, le mois en toutes lettres et l’année ; retirer le texte juste en dessous. Dans chaque carte, conserver « Comprendre le calcul » et supprimer « Sources et limites », « Données utilisées » et « Compléter ou corriger cette séance ». La correction reste disponible par l’historique.

Retirer le bloc « Données pour les outils » de Mesures. Les nouvelles séances reprennent la hauteur, la naissance et l’équation du profil ; les repères de mesure suivent les guides du catalogue sauf préférence explicite existante. Retirer toute situation déclarée du profil, des séances, des exports et des conditions des calculs. Ne pas attribuer rétroactivement de protocole aux anciennes séances.

## Tour de taille / hauteur — ajustement du 8 octobre 2026

La carte porte seulement « Tour de taille / hauteur ». Retirer sa phrase introductive sur l’adiposité et l’alerte « Mesurez le tour de taille […] Le protocole actuel est différent ou inconnu ». Le rapport utilise le tour de taille normal. Les protocoles historiques restent conservés et les règles d’affichage des classifications sont inchangées.
