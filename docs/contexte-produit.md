# Produit et parcours

État au 5 octobre 2026. Point d’entrée : [CONTEXTE.md](../CONTEXTE.md).

## Objectif

Permettre à une personne de saisir ses mesures corporelles, de suivre leur évolution, d’ajouter des notes et des photos et de gérer ses données personnelles. Interface mobile en français, sauvegarde réelle et organisation permettant une évolution SaaS.

## Compte et démarrage

Le visiteur voit le formulaire de création de compte ou de connexion. Les liens directs ne donnent pas accès au suivi sans session ; les informations légales restent consultables.

L’inscription ouvre directement une session, sans email de confirmation. Le minimum de mot de passe actuel est de six caractères. La récupération du mot de passe conserve son lien par email.

Le nouvel utilisateur renseigne sa hauteur, choisit un objectif chiffré ou un suivi sans cible, puis autorise le suivi corporel en une case. Ces informations sont sauvegardées ensemble. Aucun poids, mesure, note, photo ou objectif fictif n’est ajouté. Les autorisations de photos d’évolution et de rappels sont demandées à leur utilisation.

## Mesures et Analyse

Mesures propose date, poids, mensurations favorites, autres mensurations puis note et photos facultatives. L’historique est accessible directement. Les anciennes valeurs sont des repères séparés des champs vides. Les brouillons de nouvelle saisie et d’édition restent en mémoire pendant la navigation. Les favoris et leur ordre sont personnalisables.

Analyse distingue aucune entrée, premier repère et évolution sur plusieurs jours. Le choix de la mesure précède le graphique. « Comparer deux périodes », « Photos de comparaison » et « Bilan mensuel » suivent le repère principal ; les indicateurs et objectifs facultatifs sont repliés. La dernière valeur connue est distincte des valeurs de période. L’historique propose une consultation datée avant l’édition. Les retours restaurent période, mesure, filtres et défilement. Un objectif actif est actuellement enregistré par compte, malgré le titre au pluriel. Les calculs viennent des données réelles ; leurs conventions sont dans [calculs.md](calculs.md).

## Mon espace

Mon espace commence par un menu : Profil, Objectifs, Mesures favorites, Rappels, Données et confidentialité. Le profil s’ouvre depuis ce menu et permet de modifier le pseudo, la hauteur et la photo de profil. La photo peut être remplacée ou retirée, puis enregistrée avec « Enregistrer mon profil ». Elle est privée, recadrée au centre en carré et affichée en cercle. Dans l’en-tête, elle remplace l’icône de personnage après sauvegarde ; sans photo, l’icône reste affichée.

Le champ du fuseau horaire est absent de Mon espace. Sa valeur technique reste conservée pour le calendrier. L’écran Rappel possède encore son réglage de fuseau horaire.

Le compte donne accès aux objectifs, favoris, consentements, exports, suppression et gestion des sessions.

## Rappels

Le formulaire propose uniquement la semaine. Plusieurs jours peuvent être sélectionnés ; au moins un reste sélectionné. Tous partagent la même heure et le même canal. L’aperçu suit les jours choisis et les changements d’heure locale.

Le formulaire suit horaires → autorisation volontaire → confirmation. Les horaires enregistrés sont distincts des notifications actives sur l’appareil. Un rappel désactivé n’affiche aucune date future comme un envoi prévu. Un canal indisponible est désactivé dans l’interface. Le fuseau est détecté pour un nouveau rappel et reste modifiable discrètement. Un rappel existant actif sur un autre appareil est conservé.

Les notifications Web Push nécessitent un appareil compatible, une autorisation et un abonnement actif. Sur iPhone, l’application doit être ajoutée à l’écran d’accueil. Le rappel par email est facultatif et distinct des emails d’authentification ; sa disponibilité dépend de la configuration serveur.

Les règles historiques quinze jours et mois restent comprises par le moteur pour compatibilité. Réenregistrer un ancien rappel depuis le formulaire le convertit en hebdomadaire ; les anciennes règles ne sont pas modifiées en masse.

## Données personnelles

Les données sont isolées par propriétaire. L’utilisateur peut exporter, retirer ses autorisations et supprimer son compte après confirmation de son mot de passe. Les photos d’évolution sont stockées dans un espace privé. La photo de profil réduite est conservée dans le profil privé. Voir [confidentialite.md](confidentialite.md) pour les documents et paramètres de l’exploitant restant à compléter.

La refonte UX du 5 octobre 2026 reste en développement. Voir [le diagnostic et la validation](ux-parcours.md) pour le détail et les essais sur téléphone encore nécessaires.
