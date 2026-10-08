# Calculs et calendrier

Les sources conservent leur précision. L’arrondi intervient à l’affichage seulement. Un champ vide est absent, jamais zéro. Point et virgule sont acceptés ; les nombres doivent être finis et positifs. Une entrée contient au moins une mesure, une note non vide ou une photo.

La limite technique des mesures est 100 000 unités, celle de la stature 300 cm. Ces limites n’ont pas de signification médicale. La virgule, le signe moins U+2212 et les espaces insécables sont communs aux écrans.

Voir aussi le [dossier scientifique Analyse approfondie](outils-scientifiques.md) pour les protocoles, formules, domaines d’application et sources vérifiées.

## Indicateurs

| Indicateur       | Formule                        | Affichage         |
| ---------------- | ------------------------------ | ----------------- |
| IMC              | poids kg / (stature cm / 100)² | 1 décimale, kg/m² |
| Taille / stature | tour de taille cm / stature cm | 2 décimales       |
| Taille / hanches | tour de taille cm / hanches cm | 2 décimales       |
| RFM | 64 (masculine) ou 76 (féminine) − 20 × hauteur / tour spécifique | 1 décimale, % |
| DER Mifflin–St Jeor | 10 × poids kg + 6,25 × hauteur cm − 5 × âge + 5 (masculine) ou −161 (féminine) | entier, kcal/jour |

La stature est conservée dans chaque entrée. Modifier le profil ne change pas les résultats passés. Une correction historique est explicite dans le formulaire d’édition. Les ratios utilisent les valeurs d’une même entrée. Une valeur absente ou un dénominateur nul produit un état indisponible.

La classification abdominale NICE exige un contexte adulte compatible, IMC < 35 et protocole confirmé. Aucun diagnostic ni score global de santé n’est attribué. Références : [OMS, IMC](https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index) et [NICE, adiposité centrale](https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity).

## Périodes et graphiques

Plusieurs observations d’un même jour sont moyennées. La moyenne de période est ensuite la moyenne des jours renseignés ; les jours manquants ne sont pas estimés. Les axes utilisent les dates réelles et des segments sans lissage. Une observation seule donne un point.

La dernière valeur globale est distinguée de l’écart premier / dernier point de période. 1M, 3M, 6M et 1A soustraient des mois calendaires, avec borne au dernier jour du mois. MAX commence à la première entrée.

Comparaison B − A : différence entre les moyennes journalières des périodes ; pourcentage = différence / moyenne A × 100 si la référence n’est pas nulle. Durées calendaires, jours renseignés, premières et dernières valeurs restent distincts. Aucun sens de variation n’est automatiquement qualifié de réussite.

## Objectif et projection

Progression = (actuelle − départ) / (cible − départ) × 100, bornée de 0 à 100. Barre et texte partagent ce calcul. Le maintien, cible égale au départ, n’utilise aucun pourcentage artificiel.

La projection applique une régression linéaire aux dates réelles des 90 derniers jours renseignés depuis le départ. Minimum : quatre jours distincts sur 21 jours. Conditions : pente absolue ≥ 0,005 unité / jour, R² ≥ 0,6, direction vers la cible, estimation de 1 à 365 jours. Les autres cas n’affichent aucune date. C’est un scénario conditionnel.

## Série et bilan

Une semaine va du lundi au dimanche selon le jour local. Une note ou photo seule compte comme entrée valide. La semaine en cours peut rester ouverte sans casser la série de la semaine précédente. Les entrées futures sont interdites.

Le bilan est recalculé depuis les sources du mois : nombre d’entrées et de jours distincts, valeurs disponibles, moyennes, notes et indicateurs. Le mois courant porte « En cours ».

## Rappels

- Semaine : jour choisi à l’heure locale, puis sept jours calendaires.
- 15 jours : première occurrence identique, puis **quinze** jours calendaires. Le jour de semaine évolue.
- Mois : même rang du jour choisi que la première occurrence. Si un cinquième n’existe pas, le quatrième est retenu.

Les dates sont créées dans le fuseau IANA puis stockées en UTC. Au printemps, une heure inexistante est décalée vers l’heure valide suivante (02:30 → 03:30), puis revient à l’heure choisie lors du prochain rendez-vous. Une heure répétée à l’automne suit la résolution standard de Luxon et ne produit qu’une occurrence.

Modifier la règle redéfinit son ancre. Un réenregistrement sans changement de calendrier conserve cette ancre, notamment le rythme de quinze jours. La révision technique change pour annuler les anciens traitements. Changer le fuseau du profil ne modifie pas silencieusement un rappel existant ; celui-ci doit être réenregistré avec le fuseau souhaité. Les trois prochaines dates sont affichées. La réception dépend du téléphone, du réseau et du fournisseur.
