# Produit et parcours

État au 6 octobre 2026. Point d’entrée : [CONTEXTE.md](../CONTEXTE.md).

## Objectif

Permettre à une personne de saisir ses mesures corporelles, de suivre leur évolution, d’ajouter des notes et de gérer ses données personnelles. Interface mobile en français, sauvegarde réelle et organisation permettant une évolution SaaS.

## Compte et démarrage

Le visiteur voit le formulaire de création de compte ou de connexion. Les liens directs ne donnent pas accès au suivi sans session ; les informations légales restent consultables.

L’inscription ouvre directement une session, sans email de confirmation. Le minimum de mot de passe actuel est de six caractères. La récupération du mot de passe conserve son lien par email.

Le formulaire « Votre point de départ » pose uniquement les questions de hauteur, naissance, sexe utilisé pour les calculs et objectif, puis demande l’autorisation du suivi corporel en une case. La hauteur, la naissance et le choix d’équation sont obligatoires, avec la possibilité de ne pas utiliser les équations. Le titre « Données pour les outils », les paragraphes d’introduction, les textes d’aide, l’âge calculé, la situation, la date de mesure de la hauteur et les protocoles sont absents de l’inscription. Les champs complémentaires de hauteur et de protocole restent dans le profil. La situation déclarée est entièrement retirée. Les nouvelles séances reprennent le profil et les repères définis par les guides du catalogue ; aucune date de hauteur n’est inventée. Ces informations sont sauvegardées ensemble en local comme dans le cloud ; aucun poids, mesure, note ou objectif fictif n’est ajouté. Les autorisations de rappels sont demandées à leur utilisation.

## Mesures et Analyse

Mesures propose date, poids, mensurations favorites, guide des mesures puis note facultative. Les nouveaux comptes commencent avec poids, tour de taille et hanches ; les autres mesures passent par « Personnaliser ». Les favoris existants sont conservés. Chaque mensuration possède un lien « Guide » ouvrant sa fiche sans effacer la saisie ; le guide déroulant reste disponible. Le poids n’a plus de guide. Le bloc « Données pour les outils » est retiré de Mesures. L’ajout direct d’autres mensurations a été retiré ; « Personnaliser » permet toujours de choisir et ordonner les favorites par glisser-déposer. Les valeurs non favorites déjà présentes dans une entrée ou un brouillon restent consultables et modifiables. Le [guide illustré](guide-mensurations.md) couvre chaque mensuration du catalogue, avec les favorites en premier, les repères et les gestes à reproduire. L’historique est accessible en bas de Mesures. Les anciennes valeurs sont des repères séparés des champs vides. Les brouillons de nouvelle saisie et d’édition restent en mémoire pendant la navigation.

Analyse distingue aucune entrée, premier repère et évolution sur plusieurs jours. Le choix d’une ou plusieurs mesures précède le graphique. Une seule courbe utilise son unité ; plusieurs courbes affichent leur évolution en pourcentage depuis leur premier point de la période, avec valeurs exactes accessibles par date. Les périodes proposées sont 3M, 6M, 1A et MAX. La rubrique « Analyse approfondie » sous le graphique regroupe IMC, tour de taille/hauteur, taille/hanches et dépense au repos estimée. Le sélecteur « Séance analysée » affiche seulement une date lisible, par exemple « 8 octobre 2026 », sans texte introductif dessous. La carte « Tour de taille / hauteur » n’a plus de phrase introductive ni d’alerte demandant de renseigner un protocole. Le rapport utilise le tour de taille normal. Les cartes conservent « Comprendre le calcul » et retirent « Sources et limites », « Données utilisées » et « Compléter ou corriger cette séance ». Voir le [dossier scientifique](outils-scientifiques.md). « Les autres mesures » a été retiré. « Comparer deux périodes » et « Bilan mensuel » suivent les indicateurs ; les objectifs facultatifs restent repliés. La dernière valeur connue est distincte des valeurs de période. L’historique propose une consultation datée avant l’édition. Les retours restaurent période, mesure, filtres et défilement. Un objectif actif est actuellement enregistré par compte, malgré le titre au pluriel. Les calculs viennent des données réelles ; leurs conventions sont dans [calculs.md](calculs.md).

## Mon espace

Mon espace commence par un menu : Profil, Objectifs, Mesures favorites, Rappels, Données et confidentialité. Le profil s’ouvre depuis ce menu et permet de modifier le pseudo, la hauteur, la date de naissance, le sexe utilisé pour les calculs, les protocoles, la date de mesure de la hauteur et la photo de profil. Les champs des calculs sont directement visibles quand le suivi corporel est autorisé. L’âge affiché est calculé à partir de la naissance, jamais stocké comme une valeur fixe. Ces réglages alimentent les nouvelles séances ; les séances enregistrées et les brouillons en cours gardent leurs propres informations. La modification des valeurs d’une séance reste accessible depuis l’historique. La photo peut être remplacée ou retirée puis enregistrée. Elle apparaît en cercle dans le profil et l’en-tête ; sans photo, l’icône de personnage est affichée.

Le champ du fuseau horaire est absent de Mon espace. Sa valeur technique reste conservée pour le calendrier. L’écran Rappel possède encore son réglage de fuseau horaire.

Le compte donne accès aux objectifs, favoris, consentements, exports, suppression et gestion des sessions.

## Rappels

Le formulaire propose uniquement la semaine. Plusieurs jours peuvent être sélectionnés ; au moins un reste sélectionné. Tous partagent la même heure et le même canal. L’aperçu suit les jours choisis et les changements d’heure locale.

Le formulaire suit horaires → autorisation volontaire → confirmation. Les horaires enregistrés sont distincts des notifications actives sur l’appareil. Un rappel désactivé n’affiche aucune date future comme un envoi prévu. Un canal indisponible est désactivé dans l’interface. Le fuseau est détecté pour un nouveau rappel et reste modifiable discrètement. Un rappel existant actif sur un autre appareil est conservé.

Les notifications Web Push nécessitent un appareil compatible, une autorisation et un abonnement actif. Sur iPhone, l’application doit être ajoutée à l’écran d’accueil. Le rappel par email est facultatif et distinct des emails d’authentification ; sa disponibilité dépend de la configuration serveur.

Les règles historiques quinze jours et mois restent comprises par le moteur pour compatibilité. Réenregistrer un ancien rappel depuis le formulaire le convertit en hebdomadaire ; les anciennes règles ne sont pas modifiées en masse.

## Données personnelles

Les données sont isolées par propriétaire. L’utilisateur peut exporter, retirer ses autorisations et supprimer son compte après confirmation de son mot de passe. L’ajout de photos aux mesures et leur comparaison ont été retirés ; la photo de profil est conservée. Les API refusent les nouveaux envois de photos de mesures. Le nettoyage des anciens fichiers est conservé pour le retrait du suivi et la suppression du compte. Voir [confidentialite.md](confidentialite.md) pour les documents et paramètres de l’exploitant restant à compléter.

La refonte UX du 5 octobre 2026 reste en développement. Voir [le diagnostic et la validation](ux-parcours.md) pour le détail et les essais sur téléphone encore nécessaires.
