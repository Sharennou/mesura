# Outils : dossier scientifique et règles de calcul

Version des règles : `mesura-tools-v1`. Consultation des sources : **6 octobre 2026**. Les tests vérifient les équations et les règles logicielles ; ils ne constituent pas une validation clinique de Mesura.

## Organisation et portée

« Outils » remplace « IMC et ratios » sous le graphique d’Analyse. L’adresse `#analysis` et l’identifiant accessible `analysis-indicators-title` sont conservés. Les cinq cartes sont aussi consultables dans le détail d’une entrée. Une sélection explicite de séance remplace la recherche indépendante du dernier résultat de chaque indicateur : aucune association implicite de mensurations de dates différentes. Une séance incomplète affiche les raisons d’indisponibilité et permet sa correction ou une nouvelle mesure guidée.

Les calculs sont exécutés dans le navigateur, sans appel à un service de calcul. Les données restent sauvegardées par le dispositif privé existant (API locale SQLite ou compte cloud Supabase). Les liens scientifiques ne contiennent aucune mensuration.

## Trois niveaux à distinguer

- **Recommandations** : NICE pour l’utilisation conjointe de l’IMC et du rapport tour de taille/hauteur chez l’adulte ; HAS pour les limites du dépistage anthropométrique ; OMS pour les protocoles et différences de populations.
- **Équations prédictives** : RFM et Mifflin–St Jeor, étudiées dans des populations spécifiques. Aucun résultat individuel garanti, diagnostic, score de normalité du RFM ou intervalle de confiance ajouté.
- **Choix Mesura** : restrictions d’âge, contexte explicite, blocage des situations particulières, provenance datée de la hauteur, protocole RFM distinct et comparaison de séances compatibles. Ces règles conservatrices ne constituent pas des recommandations officielles supplémentaires.

## Calculs

| Outil                    | Formule et unités                                                | Règles d’affichage                                                              |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| IMC existant             | poids kg / (hauteur cm / 100)²                                   | kg/m² ; repères adultes seulement avec âge et situation compatibles             |
| Adiposité abdominale     | RTH = tour de taille / hauteur, dans la même unité               | Sans unité ; IMC associé de la même séance                                      |
| Taille/hanches existant  | tour de taille cm / tour de hanches cm                           | Sans unité, descriptif sans catégorie universelle                               |
| RFM masculin / féminin   | 64 / 76 − 20 × (hauteur / tour de taille)                        | Déjà en %, une décimale ; résultat ≤ 0 ou ≥ 100 non interprétable, jamais borné |
| DER masculine / féminine | 10 × poids kg + 6,25 × hauteur cm − 5 × âge en années + 5 / −161 | kcal/jour, entier ; aucun facteur d’activité ni objectif alimentaire            |

L’âge correspond aux années révolues à la date de séance. Pour une naissance le 29 février, l’année supplémentaire est comptée au 1er mars dans une année non bissextile (convention calendaire de Mesura). Les bornes incluent tous les âges révolus de 20 à 69 ans pour le RFM et de 19 à 78 ans pour la DER. Elles s’appuient sur les populations des travaux retenus et ne sont pas des frontières biologiques. Une extension exige une validation applicable.

La classification abdominale exige un âge connu ≥ 18 ans, le protocole NICE confirmé, une hauteur datée sans provenance future et un IMC strictement inférieur à 35. Intervalles continus : RTH < 0,40 = sous la plage retenue ; 0,40 ≤ RTH < 0,50 = référence ; 0,50 ≤ RTH < 0,60 = augmentée ; RTH ≥ 0,60 = élevée. La catégorie favorable ne signifie jamais absence de risque. L’IMC absent ou ≥ 35 laisse le ratio brut visible et désactive sa classification avec explication.

Les deux équations nécessitent un choix explicite « masculine » ou « féminine ». Ce choix commun aux deux outils est distinct de l’identité de genre. « Non renseigné » est la valeur initiale. Il peut être préparé dans le profil pour les futures séances et corrigé explicitement pour une séance passée. Rien n’est inféré à partir du nom ou de la photo.

Grossesse, allaitement, conditions altérant fortement la composition corporelle (exemples : œdèmes importants, amputation, maladie ou traitement) suspendent les estimations et classifications. Une situation inconnue les suspend également. Les valeurs brutes restent conservées. Cette restriction générale est un choix produit ; elle ne signifie pas que toutes ces situations ont été évaluées dans les études. Aucune recommandation alimentaire automatique n’est produite.

## Protocoles et divergences résolues

1. **NICE** : milieu entre dernière côte et sommet de la crête iliaque ; ruban horizontal ; lecture après expiration naturelle. Le rapport utilise des longueurs dans la même unité.
2. **RFM original** : bord supérieur latéral de la crête iliaque droite, debout, peau nue, lecture en fin d’expiration. La mesure dédiée `waist-rfm` évite de réutiliser silencieusement `waist` ou `abdomen`.
3. **Validation mexicaine** : le texte intégral décrit une mesure **au niveau du nombril**, différente du protocole original. Ce travail externe (61 adultes, 20–37 ans) documente une portée limitée ; il ne justifie pas de rendre les protocoles interchangeables. Mesura conserve le protocole de l’étude originale.
4. **NICE et continuité des seuils** : le texte publie « 0.4 to 0.49 » et « 0.5 to 0.59 ». À la demande du produit, ces plages sont implémentées comme [0,40 ; 0,50[ et [0,50 ; 0,60[ sur la valeur non arrondie, sans trou entre 0,49 et 0,50. Les libellés français sont reformulés pour ne pas promettre l’absence de risque.
5. **Mifflin** : la formule simplifiée est bien explicitement publiée dans le résumé original, distincte de la régression initiale à coefficients 9,99 et 4,92. C’est la forme simplifiée qui est retenue.
6. **Précision** : la revue de Frankenfield compare notamment la fréquence d’erreurs dans une bande de 10 % ; ce résultat de population ne devient pas une garantie individuelle ou un intervalle de confiance dans l’application.

## Registre des sources

Les titres, auteurs/organismes, années, DOI, rôles, liens et date de consultation sont centralisés dans `shared/tool-sources.ts` et affichés dans les cartes.

| Référence                                                                                                                                                       | Rôle                                                  | Vérification                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [NICE NG246](https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity), 2025, actualisation 08/01/2026 | Interprétation et protocole ; 1.9.5, 1.9.8, 1.9.14–15 | Page officielle et [historique](https://www.nice.org.uk/guidance/ng246/chapter/Update-information) lus. Actualisation 2026 relative aux enfants ; recommandations adultes citées conservées et datées 2022. |
| [HAS, parcours adulte](https://www.has-sante.fr/jcms/p_3408871/fr/guide-du-parcours-de-soinssurpoids-et-obesite-de-l-adulte), 2024                              | Interprétation                                        | Page officielle mise à jour le 27/11/2024 : évaluation multidimensionnelle indispensable.                                                                                                                   |
| [OMS, Waist circumference and waist-hip ratio](https://www.who.int/publications/i/item/9789241501491), 2011, consultation 2008                                  | Protocole et limites d’interprétation                 | Notice officielle consultée : méthodes et variations selon sexe, âge et origine. Aucun seuil universel en cm ajouté.                                                                                        |
| [Woolcott & Bergman](https://pmc.ncbi.nlm.nih.gov/articles/PMC6054651/), 2018 ; DOI 10.1038/s41598-018-29362-1                                                  | Formule, protocole, validation                        | Texte intégral original sur PMC : validation DXA de 3 456 adultes de 20–69 ans. Accès Nature refusé par le moteur de consultation ; version intégrale PMC lue directement.                                  |
| [Guzmán-León et al.](https://pubmed.ncbi.nlm.nih.gov/31891616/), 2019 ; DOI 10.1371/journal.pone.0226767                                                        | Validation externe                                    | Résumé Europe PMC et [texte intégral](https://pmc.ncbi.nlm.nih.gov/articles/PMC6938316/) lus. Petit échantillon du nord-ouest du Mexique, protocole ombilical, méthodes de référence divergentes.           |
| [Mifflin et al.](https://pubmed.ncbi.nlm.nih.gov/2305711/), 1990 ; DOI 10.1093/ajcn/51.2.241                                                                    | Formule et population de développement                | Résumé original PubMed lu : forme simplifiée, 498 adultes de 19–78 ans, calorimétrie indirecte.                                                                                                             |
| [Frankenfield, Roth-Yousey & Compher](https://pubmed.ncbi.nlm.nih.gov/15883556/), 2005 ; DOI 10.1016/j.jada.2005.02.005                                         | Validation                                            | Résumé original via Europe PMC, PubMed affichant parfois un contrôle d’accès. Erreurs individuelles et sous-représentation de certains groupes.                                                             |

Contrôle des corrections : notices originales indexées par Europe PMC pour les études et métadonnées Crossref du RFM consultées le 06/10/2026. Aucune correction liée aux formules n’y est signalée. Le lien de 2011 associé à la revue est un **commentaire** sur l’hypermétabolisme, pas un erratum. Cette vérification documentaire n’atteste pas l’exhaustivité de toutes les publications postérieures.

## Données, migration et exports

- `Entry.tools` facultatif : version immuable, naissance, choix d’équation, situation **à la séance**, protocole `waist`, protocole `waist-rfm`, date et origine de la hauteur. La hauteur reste dans `Entry.height` en cm ; les valeurs standard restent en kg ou cm dans `Entry.values`.
- `Profile.toolProfile` facultatif : naissance et équation proposées aux futures séances ; `Profile.heightDate` facultatif. Le démarrage ne suppose pas une date de mesure de la hauteur : elle doit être précisée pour les nouveaux outils.
- SQLite : migration additive `006_body_tools.sql`, colonnes JSON facultatives et date de hauteur. Les anciennes entrées restent inchangées, sans protocole attribué.
- Cloud : adaptation additive et idempotente du compte JSON ; le catalogue reçoit `waist-rfm` sans modifier les valeurs ni les contextes existants. Aucune migration de table Postgres nécessaire. Les API maintiennent le consentement, la propriété des données, l’idempotence et la suppression du contexte corporel au retrait du suivi.
- Versions : ne pas modifier la signification de `mesura-tools-v1`. Pour une évolution scientifique, ajouter une nouvelle version et conserver le moteur de lecture des anciennes versions. Les résultats dérivés ne sont pas persistés ; leurs entrées, protocoles et version permettent de les reproduire.
- Exports JSON/ZIP : `schemaVersion: 2`, contexte complet et valeur brute ; CSV : sept colonnes historiques conservées dans le même ordre, puis colonnes de traçabilité et de version. Les notes conservent la protection contre l’injection de formules CSV.
- Mesura ne possède pas d’import utilisateur dans cette version. Le chargement des anciens comptes/base et le round-trip JSON sont couverts ; aucun import fictif n’a été ajouté. Les restaurations de sauvegardes conservent les nouveaux champs avec les données du compte.

Une hauteur datée au plus tard à la séance peut être reprise, avec son origine affichée. Une ancienne hauteur sans date reste visible pour les ratios historiques, mais ne déclenche pas les nouvelles estimations/classifications. Les poids et tours ne sont jamais cherchés dans une autre séance. La comparaison RTH exige des protocoles NICE compatibles ; la variation RFM exige même équation/version et mesures RFM conformes. Elle reste une variation d’estimation.

## Exactitude, maintenance et vérification

Fonctions pures dans `shared/body-tools.ts`, validation partagée dans `shared/tool-schemas.ts`, sérialisation CSV commune dans `shared/export.ts`. Conversions explicites m→cm et g→kg avant calcul ; unités non prises en charge refusées. Les formulaires restent en cm/kg. Les décimales françaises sont acceptées ; les champs et corrections ne réarrondissent plus les valeurs sauvegardées. Arrondi uniquement à l’affichage ; la précision affichée augmente si nécessaire pour ne pas franchir artificiellement un seuil.

À chaque modification : relire les sources primaires et leurs mises à jour ; distinguer formule, recommandation et choix produit ; modifier les tests de frontière, date, protocole et migration ; vérifier les deux stockages, exports, écrans vides et historiques. Déployer l’API comprenant les nouveaux champs avant l’interface. Les versions anciennes de l’interface ne doivent pas servir à renseigner de nouveaux protocoles.

Limites conservées : auto-mesure non contrôlée ; erreur individuelle non quantifiée ; populations particulières non validées ; absence de classification pédiatrique ; dates et protocoles historiques inconnus impossibles à reconstruire automatiquement ; absence de suivi des révisions d’une correction manuelle (fonctionnement existant : une édition remplace la séance). Les tests navigateur et axe ne remplacent pas une évaluation clinique ou une revue sur téléphone physique avec lecteur d’écran.
