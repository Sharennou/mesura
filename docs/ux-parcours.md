# Mesura — parcours mobiles corrigés

Travail du 5 octobre 2026, sur la version locale React / TypeScript / Vite et Fastify / SQLite. Les changements concernent l’interface et son état de navigation. Aucun schéma, compte, mesure, photo ou consentement de production n’a été modifié. La palette `#D3F653` / `#434FED`, Archivo, le logo, les contours et les ombres existants sont conservés.

## Diagnostic priorisé

Le diagnostic initial vient du code des écrans et des styles disponibles. Les captures de la version corrigée et les tests de parcours complètent cette inspection.

| Priorité | Problème constaté dans la version initiale                                                                                                                                              | Conséquence                                                                                       | Correction                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| P1       | `PageTitle` envoyait tous les retours vers Analyse ; `navigate` et `hashchange` remontaient systématiquement en haut. Les états de période et de mesure vivaient dans un écran démonté. | Perte de contexte après un outil ou une modification.                                             | Navigation avec historique du navigateur, positions conservées et état d’écran en mémoire de session.                   |
| P1       | L’édition effaçait le brouillon de nouvelle mesure. L’identifiant de requête était recréé après un démontage.                                                                           | Brouillon perdu et risque de doublon si la réponse à une sauvegarde se perd avant une navigation. | Brouillon indépendant de l’édition, identifiant de requête conservé, verrou synchrone pendant l’envoi.                  |
| P1       | L’Analyse rendait les mêmes graphiques, indicateurs et projection sans données suffisantes.                                                                                             | Écran vide et prochaine action difficile à identifier.                                            | États sans entrée, premier repère et évolution ; projection uniquement calculable.                                      |
| P2       | Aucun accès nommé à l’historique dans Mesures ; titres « Tous vos repères », « Votre évolution en images », « Votre bilan du mois ».                                                    | Fonctions difficiles à retrouver, noms incohérents.                                               | Noms explicites identiques dans les titres et les accès.                                                                |
| P2       | Carte de poids haute, champ sans contour et anciennes valeurs en placeholders.                                                                                                          | Autres mensurations repoussées et confusion entre repère antérieur et saisie.                     | État vide compact, champs délimités, valeurs antérieures séparées.                                                      |
| P2       | L’historique proposait directement édition/suppression et ouvrait les photos dans une galerie globale.                                                                                  | Consultation et modification confondues ; photos de l’entrée difficiles à retrouver.              | Liste → détail daté avec note/photos → édition explicite.                                                               |
| P2       | Les outils étaient placés après indicateurs, objectifs et projection.                                                                                                                   | Découverte tardive de la comparaison et du bilan.                                                 | Trois accès après le repère principal ; détails secondaires repliés.                                                    |
| P2       | Rappel : activation générale avant horaires, canal push parfois sélectionnable malgré son indisponibilité, « Autoriser ce canal », aperçu futur désactivé.                              | État de réception et étapes nécessaires ambigus.                                                  | Horaires → notifications volontaires → confirmation avec état enregistré ; pas de dates futures pour un rappel inactif. |
| P2       | Mon espace commençait par le formulaire et la photo du profil.                                                                                                                          | Réglages et confidentialité peu visibles.                                                         | Menu avant formulaire ; profil ouvert séparément.                                                                       |

Hypothèses à vérifier avec des personnes : compréhension des moyennes journalières, pertinence des choix rapides 7/30 jours, préférence pour les détails repliés, compréhension du brouillon conservé. Les résultats automatiques ne mesurent pas le temps de réalisation ni la satisfaction des utilisateurs.

## Parcours corrigés et changements par écran

**Mesures.** Accès direct après connexion. Accès léger « Historique des mesures ». Date → poids → favoris → guide illustré → note facultative → historique en bas de page. L’ajout direct d’autres mensurations a été retiré à la demande du propriétaire ; la personnalisation des favorites reste accessible. Le [guide des mesures](guide-mensurations.md) propose les repères et gestes pour les 14 mensurations, une fiche à la fois. Le champ vide affiche « Saisir » ; un ancien poids est un texte de repère, jamais une nouvelle valeur. Les valeurs déjà présentes restent accessibles même si elles ne sont pas des favorites. Une valeur ou une note suffit ; les champs vides restent absents du payload. Les champs acceptent la virgule française et utilisent le clavier décimal.

**Enregistrement.** « Enregistrer la mesure » reste l’action fixe. La confirmation n’apparaît qu’après une réponse réussie et contient date, valeurs, et note. « Voir mon analyse » est l’action principale ; « Consulter la mesure enregistrée » est secondaire. En échec, les champs restent saisis, le problème apparaît et « Réessayer l’enregistrement » est disponible. Le verrou bloque les soumissions simultanées ; l’identifiant persistant permet au serveur de reconnaître une même sauvegarde après une réponse perdue.

**Historique des mesures.** Filtre par mois ou date précise. Une date ouvre le détail en lecture seule : toutes les valeurs, la note de cette entrée. « Modifier la mesure » ouvre le formulaire titré de la même façon, avec « Enregistrer les modifications ». La sauvegarde revient au détail. Le retour à la liste retrouve ses filtres et sa position. La suppression reste séparée et confirmée.

**Analyse.** Sans entrée : explication et « Enregistrer ma première mesure », sans pile de résultats absents. Avec un seul jour renseigné : dernière valeur datée et invitation à ajouter une prochaine mesure ; aucune tendance. Avec plusieurs jours : graphique, période et variation descriptive. Choix de mesure avant le graphique. « Dernière valeur connue » est datée et signale « hors période » lorsqu’il le faut ; la courbe et la variation concernent uniquement la période choisie. Un repère chiffré absent donne un chemin vers une autre mesure ou la saisie. Les jours d’une même date sont moyennés, sans inventer les jours manquants.

Les accès **Comparer deux périodes** et **Bilan mensuel** suivent le repère principal. Les autres valeurs, indicateurs et objectifs restent accessibles dans des détails repliés. « Hauteur », « Tour de taille / hauteur » et « Tour de taille / tour de hanches » sont explicités. Les données manquantes sont nommées. Les objectifs restent facultatifs. Une projection n’apparaît que si les critères du calcul existant sont remplis ; ses limites sont affichées. Aucune hausse ou baisse de poids ne reçoit un jugement de valeur.

**Comparer deux périodes.** Choix rapides : 30 jours, 7 jours, mois courant/mois précédent ; dates personnalisées en second niveau. « Période de référence » et « Période comparée » sont nommées et datées. Poids et favorites sont proposés d’abord ; les autres mesures restent disponibles. Le résultat est l’écart entre les moyennes journalières des périodes. Les détails de calcul sont repliés. Une absence de valeur identifie la période concernée et propose de changer les dates ou d’ajouter une mesure.

**Bilan mensuel.** Mois choisi visible, nombre d’entrées et jours renseignés, évolutions disponibles, notes uniquement si présentes. Les indicateurs sans valeur calculable sont omis. Mois vide : « Ajouter une mesure », « Choisir un autre mois » et accès aux mois renseignés. Le lien vers l’historique applique le mois choisi.

**Rappels.** Séquence : 1. jours et heure ; 2. notifications ; 3. confirmation. Fuseau détecté pour un nouveau rappel, réglage discret possible ; un fuseau déjà enregistré est conservé. Un canal indisponible est désactivé. Le consentement Mesura et la permission du navigateur sont expliqués séparément. Les libellés reflètent l’état : autoriser, activer sur cet appareil, disponible ou bloqué. Les horaires peuvent être enregistrés sans envoi actif. Aucun prochain rappel n’est présenté lorsque le rappel est désactivé. Un rappel déjà actif sur un autre appareil n’est pas désactivé simplement parce que le navigateur courant n’a pas d’abonnement. Aucun canal supplémentaire n’a été développé.

**Mon espace.** Menu Profil, Objectifs, Mesures favorites, Rappels, Données et confidentialité, Informations du service. Le formulaire du profil s’ouvre depuis ce menu. Export, gestion des consentements, suppression de compte, sessions et déconnexion restent disponibles. Les actions destructrices conservent leurs confirmations.

**Navigation.** La cloche et l’icône de compte restent dans l’en-tête ; les deux onglets sont conservés, sans accueil supplémentaire. Les retours de l’interface et du navigateur restaurent le contexte précédent. Les brouillons de nouvelle mesure et d’édition sont conservés en mémoire pendant les changements d’écran, puis effacés après leur sauvegarde réussie, déconnexion/changement de compte ou retrait du consentement applicable. Il n’est pas promis de conservation après fermeture/rechargement de l’application. Aucun brouillon privé n’est ajouté au stockage du navigateur.

## Prévisualisation locale

Serveur isolé : `http://127.0.0.1:5182`. Données dans `.runtime/ux-preview/`, distinctes du dossier de données habituel et de Supabase.

Comptes fictifs : `vide@mesura.example.test`, `premiere@mesura.example.test`, `suivi@mesura.example.test`. Mot de passe de test commun : `ParcoursMesura!2026`. La connexion conduit directement à Mesures.

Préparation reproductible : `npx tsx scripts/ux-preview.ts` après le lancement d’un serveur local de développement sur 5182 / 3012 avec `DATA_DIR=.runtime/ux-preview`, `VITE_DEPLOYMENT=local`, SMTP et VAPID vides. Les captures et l’aperçu statique sont dans `.runtime/ux-captures/` et `.runtime/ux-review.html`. Les captures peuvent être régénérées par les tests mobiles.

Le script refuse les hôtes distants et les serveurs non-développement. Il ne réinitialise aucun compte et ne supprime aucune entrée.

## Vérification

Contrôles effectués :

- Compilation TypeScript/Vite locale et bundle Supabase avec le préfixe `/mesura/` : réussis.
- 81 tests unitaires, API, règles cloud et SQL : réussis.
- 20 parcours Playwright : 10 scénarios à 390 × 844 et à 360 × 800, réussis.
- Contrôles axe WCAG 2.1 AA sur les écrans principaux et sur l’Analyse vide ; cibles tactiles mesurées d’au moins 44 px, y compris les zones de labels des champs : réussis.
- Aucune entrée, un premier repère, plusieurs jours, valeurs manquantes, note seule, période sans données : couverts.
- Sauvegarde, réponse perdue après écriture réelle, nouvelle tentative sans doublon, double clic, brouillons de nouvelle saisie et d’édition, correction et retours interface/navigateur avec filtres et défilement : couverts.
- Rappel indisponible, consentement volontaire, permission refusée/acceptée, confirmation, désactivation et rappel déjà actif sur un autre appareil : couverts. Les étapes de réception sont simulées dans l’interface.
- Hébergement statique `/mesura/`, assets, PWA, liens directs protégés et callbacks Auth simulés aux deux largeurs : réussis.

La compilation cloud conserve un avertissement Vite sur la taille du bundle ; aucune migration ou nouvelle dépendance n’a été ajoutée pour cette refonte.

Les nouveaux tests sont dans `tests/e2e/ux.spec.ts` ; le parcours existant d’accès, profil, consentement, sauvegarde, export et suppression est adapté aux nouveaux écrans dans `tests/e2e/app.spec.ts`.

Le clavier des tests est simulé par une réduction du `visualViewport` : navigation masquante retirée, barre d’action dans le flux, erreur et nouvelle tentative visibles. Les états Web Push de l’interface utilisent un navigateur et des réponses de service simulés ; ils ne constituent pas une réception effective de notification.

## À vérifier sur de vrais téléphones

- Safari iOS et Chrome Android : clavier décimal avec virgule, zoom, défilement du champ actif et erreurs, boutons fixes, zones sûres et orientation.
- Retour navigateur, geste de retour et changements d’onglet après une longue saisie ; comportement lors d’une suspension/fermeture complète (brouillon en mémoire uniquement).
- Choix des dates/mois/heure natifs, longs noms de mesures, taille du texte augmentée et VoiceOver/TalkBack.
- PWA iOS installée et Android : consentement, permission acceptée/refusée, abonnement réellement enregistré, révocation depuis les réglages, rappel reçu au bon fuseau horaire, changement d’heure et changement d’appareil.
- Parcours réels sur le backend Supabase, avec des comptes de test dédiés, avant publication.
- Petits essais utilisateurs pour confirmer que les huit tâches demandées se trouvent et se réalisent facilement.

Mise à jour du 6 octobre 2026 : étapes du guide raccourcies, blocs « À éviter » et « Bien mesurer à chaque séance » retirés, sources conservées. Favoris ordonnés par glisser-déposer avec prise en charge tactile, clavier et annulation. La fonctionnalité de photos associées aux mesures et ses options sont retirées ; la photo de profil reste disponible ; les anciennes données restent privées et leur nettoyage reste assuré.
