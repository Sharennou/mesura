# Guide des mesures

Mise à jour du 8 octobre 2026, en développement. Un guide repliable apparaît juste sous les champs des mensurations favorites. Le choix propose les favorites dans leur ordre, puis toutes les autres mensurations actives. Une fiche est affichée à la fois : schéma SVG annoté, repère, trois étapes courtes et sources. Un lien « Guide » à droite de chaque mensuration ouvre la fiche correspondante, la fait défiler dans la vue et place le focus sur son titre. Le poids est exclu du guide et de son sélecteur. L’ouverture et le choix sont conservés en mémoire pendant la navigation ; les valeurs du formulaire restent indépendantes.

Toutes les mensurations du catalogue sont couvertes. Les quatre paires de membres identifient le côté de la personne mesurée, indépendamment du côté dominant. Les schémas sont des illustrations originales de repérage, non à l’échelle. Une mesure personnalisée conserve son nom et son unité, mais reçoit uniquement une explication pour définir sa méthode : aucune anatomie n’est déduite du nom.

## Conventions et références

Ce guide est une adaptation pour le suivi à domicile, sans diagnostic ni interprétation d’une valeur. Les protocoles ne sont pas tous identiques. Le guide encourage à conserver la méthode déjà utilisée ou à noter un changement, sans recalculer ni modifier les anciennes entrées.

| Mensuration                | Convention du guide                                                                                                       | Référence vérifiée                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tour de taille             | Milieu entre dernière côte palpable et haut de la crête iliaque ; fin d’expiration normale. Distinct de l’abdomen.        | [PhenX 021602](https://www.phenxtoolkit.org/protocols/view/021602), méthode côte–bassin.                                                                       |
| Hanches                    | Tour maximal passant sur les fesses ; pieds joints ; ruban horizontal.                                                    | [CDC / NHANES 2021](https://wwwn.cdc.gov/nchs/data/nhanes/public/2021/manuals/2021-Anthropometry-Procedures-Manual-508.pdf), §3.4.9.                           |
| Biceps gauche et droit     | Tour du bras relâché au milieu acromion–olécrâne, pas tour maximal du muscle contracté.                                   | NHANES 2021, §3.4.6–3.4.7 ; adaptation au côté choisi.                                                                                                         |
| Cuisse gauche et droite    | Milieu du pli inguinal au bord supérieur de la rotule ; repérage assis à 90°, lecture debout avec jambe mesurée relâchée. | [CDC / NHANES III](https://wwwn.cdc.gov/nchs/data/nhanes3/manuals/anthro.pdf), §3.3.1.4 et §3.3.1.12 ; adaptation au côté choisi.                              |
| Poitrine                   | Partie la plus volumineuse, ruban horizontal ; même soutien-gorge non rembourré si utilisé.                               | [ANSUR II, Measurer’s Handbook, NATICK/TR-11/017](https://tools.openlab.psu.edu/publicData/ANSURII-TR11-017.pdf), §6.4.25.                                     |
| Épaules                    | Circonférence passant par le milieu des deux deltoïdes ; ne pas confondre avec une largeur.                               | ANSUR II, §6.4.69. Le protocole souligne que l’asymétrie peut empêcher une horizontale parfaite.                                                               |
| Mollet gauche et droit     | Tour maximal horizontal ; pieds à plat et poids réparti.                                                                  | ANSUR II, §6.4.22 ; adaptation au côté choisi et recherche du maximum en déplaçant le ruban.                                                                   |
| Avant-bras gauche et droit | Tour maximal, bras descendant et main ouverte, muscle relâché.                                                            | [DOD-HDBK-743A](https://mreed.umtri.umich.edu/mreed/documents/DOD-HDBK-743A_anthro_handbook.pdf), définition « Forearm Circumference, Relaxed », dimension 70. |
| Cou                        | Sous le larynx, perpendiculaire à l’axe du cou, tête droite.                                                              | [AR 600–9, 28 juin 2013](https://api.army.mil/e2/c/downloads/566071.pdf), annexe B–4.a. Seul le repère anatomique est repris.                                  |
| Abdomen                    | Au nombril, ruban horizontal, fin d’expiration normale.                                                                   | AR 600–9, annexe B–4.b ; repère appliqué ici à toute personne, sans seuil ni calcul militaire.                                                                 |

Pour la poitrine et les épaules, Mesura propose une lecture en **fin d’expiration normale** afin de fixer une consigne reproductible pour ce suivi. Il s’agit d’une adaptation explicite : ANSUR II lit ces deux tours au maximum d’une respiration calme. Les arrondis militaires, seuils, extrapolations et procédures réservées aux examinateurs ne sont pas repris.

Les blocs « À éviter » et « Bien mesurer à chaque séance » ont été retirés. Les consignes de placement, de posture et de lecture utiles restent dans les trois étapes de chaque fiche. La lecture en millimètres permet une saisie au dixième de centimètre si le ruban le permet ; elle ne garantit pas une exactitude clinique de 0,1 cm.

## Implémentation et validation

- `src/measurement-guide.ts` : instructions par région, sans données utilisateur.
- `src/components/MeasurementGuide.tsx` : sélection, schémas accessibles, étapes concises et liens de sources.
- `src/screens/Measure.tsx` : insertion après les favorites ; personnalisation conservée, ajout d’autres mensurations retiré à la demande du propriétaire.
- `tests/e2e/ux.spec.ts` : ouverture, sélection de toutes les mensurations, identification des côtés, cas personnalisé, conservation du brouillon et du choix, retour aux favoris, débordement, accessibilité et cibles tactiles à 360 / 390 px.

À vérifier sur téléphone : lecture des annotations à taille réelle, utilisation du sélecteur natif et du lecteur d’écran. Un essai de prise de mesures avec une personne formée en anthropométrie reste utile pour valider la compréhension des gestes et des repères ; les contrôles de l’interface ne valident pas la précision de la mesure corporelle obtenue.

Vérifié : compilation TypeScript/Vite et quatre parcours ciblés réussis (guide et première sauvegarde, à 360 × 800 et 390 × 844 px). Le test du guide couvre toutes les fiches, le cas personnalisé, axe WCAG 2.1 AA, les contrôles de 44 px, l’absence de débordement et les retours avec brouillon conservé. Les captures de la taille, du bras et de la cuisse sont ajoutées à `.runtime/ux-review.html`.
