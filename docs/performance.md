# Performance de Somévo — 12 octobre 2026

Les optimisations sont préparées localement. La publication et les six nouvelles mesures **PageSpeed Insights sur GitHub Pages** attendent l’autorisation du propriétaire. Les résultats Lighthouse locaux ci-dessous ne constituent pas une validation PageSpeed du site publié.

Les résultats chiffrés ci-dessous décrivent la version précédant la nouvelle identité Somévo. Le 12 octobre, les logos ont été remplacés : WebP de 440 × 110 et 660 × 165, environ 6,3 et 9,9 Kio, affichés à 176 × 44 dans les en-têtes et 220 × 55 à l’accueil. Les PNG originaux sont conservés hors du bundle. Le favicon PNG et les icônes installables utilisent désormais le symbole fourni. Les principes de prérendu et de chargement différé sont conservés ; aucun nouveau score Lighthouse n’est revendiqué pour cette refonte. La marque de performance courante est `somevo:interactive`.

## Diagnostic du rapport de référence

[Rapport PageSpeed fourni](https://pagespeed.web.dev/analysis/https-sharennou-github-io-mesura/znqdlehwhb?form_factor=mobile) : mobile 71/100 en performance, 100 dans les trois autres catégories ; FCP 3,175 s, LCP 5,555 s, Speed Index 4,617 s, TBT 0 ms, CLS 0. La version ordinateur du même rapport donne 99/100 en performance.

Le titre « VOTRE ESPACE À VOUS. » est le LCP. Le code initial exigeait le téléchargement et l’exécution de l’application complète, l’initialisation de Supabase et la résolution de session avant de montrer le formulaire. Le téléchargement tardif de la police et le CSS externe s’ajoutaient à ce démarrage. Un TBT nul ne prouve pas l’absence de travail avant le premier affichage.

La requête `/functions/v1/mesura-api/config` finit vers 1,733 s dans la trace mobile et comprend une prérequête CORS. **Elle n’est pas une condition de rendu du formulaire** : son effet ne faisait qu’actualiser les capacités et son résultat n’était pas attendu par le rendu. La trace ordinateur montre le contenu à 0,297 s et son LCP à 0,386 s, avant la fin de `/config` à 1,355 s. Le test de configuration volontairement suspendue confirme que les champs et la bascule vers la connexion fonctionnent pendant l’attente. Les durées observées de cette trace sont distinctes des métriques mobiles simulées de 3,175/5,555 s.

La variation annoncée de 71 à 98 ne peut pas être attribuée précisément sans la trace du rapport à 98 et la confirmation qu’il utilisait les mêmes fichiers. Les variations de serveur/CDN, de navigateur et d’ordonnancement peuvent changer le résultat et le graphe de simulation. Les anciens volumes augmentaient cette sensibilité. Une session existante change aussi le parcours : elle doit être distinguée d’une visite anonyme. Les mesures suivantes utilisent un navigateur neuf et vérifient le titre et l’hydratation. La [documentation Lighthouse sur la variabilité](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) recommande les mesures répétées et leurs agrégats.

## Corrections effectuées

| Composant                                                             | Changement et effet                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/PublicEntry.tsx`, `scripts/prerender-entry.ts`, `vite.config.ts` | Le vrai formulaire React est prérendu lors de la compilation. Le titre, le logo et les champs sont présents dans le HTML ; le CSS public est intégré au HTML. Aucune page alternative pour les robots.                                                                                                                                                   |
| `src/main.tsx`, `src/hydrate.tsx`                                     | Un petit amorçage laisse au formulaire public une première image avant de télécharger/hydrater React. Le formulaire reste `inert` jusqu’au montage effectif ; une erreur de téléchargement affiche une action de recharge. Session, récupération, callback Auth, écran légal et état hors ligne utilisent leur démarrage dynamique.                      |
| `src/App.tsx`, `src/cloud-auth.ts`, `src/api.ts`                      | Une visite cloud anonyme n’importe pas le SDK Supabase et n’appelle pas `/config`. Le SDK se charge à la première action Auth, pour une session stockée ou un callback. `/config` se charge lorsqu’il devient utile : espace connecté ou informations légales. Les appels sont annulables et ne se répètent pas à chaque écran.                          |
| Contrôles d’accès                                                     | Une session puis la réponse authentifiée de `/account`, appartenant à cette session, restent nécessaires pour afficher les données privées. Les réponses 401 libèrent la session courante ; une erreur 403 ou réseau la préserve. Les validations métier/API et le consentement restent en place.                                                        |
| `src/PrivateScreens.tsx`, `src/ui.tsx`, imports d’écrans              | Écrans privés et leurs dépendances chargés à la demande, directement depuis leurs fichiers, sans passer par les réexports d’Account/Explore. Supabase, Luxon, Zod, graphiques, guides et outils sont absents des requêtes de la page publique.                                                                                                           |
| `scripts/entry-styles.ts`, `src/styles/entry.css`                     | Extraction des règles communes/publics, de leurs états et media queries, dans l’ordre de la cascade. Le CSS complet accompagne les écrans privés et l’écran légal. Les états connexion, récupération, erreur, clavier et focus font partie du CSS public.                                                                                                |
| Ancien pipeline du logo, `scripts/generate-assets.ts`                 | Logo transparent en WebP 200 × 116 et 300 × 174, pour un affichage 100 × 58 à 2×/3×. Dimensions réservées, priorité haute, aucun chargement différé. Le cadrage reproduit le `object-fit: cover` d’origine. Aucun véritable SVG de ce logo n’a été trouvé ; `icon.svg` est une autre icône. Le PNG source est conservé et ne figure plus dans le bundle. |
| Polices, `scripts/optimize-fonts.py`                                  | Archivo WOFF2 : affichage 900/75 %, interface variable 600–900/100 %. Latin français, ligatures et ponctuation conservés ; `font-display: swap` conservé. Les règles condensées utilisent explicitement `font-stretch: 75%`. Source TTF et licence conservées, source hors du répertoire publié.                                                         |
| `public/sw.js`                                                        | Cache des nouveaux fichiers WOFF2, enregistrement après le montage interactif et pendant un temps disponible. Aucun cache de sessions ou de données privées.                                                                                                                                                                                             |
| Focus et navigation                                                   | Focus du titre après l’arrivée d’un écran différé. Un changement d’écran renouvelle la frontière Suspense, pour éviter de conserver l’état d’un rappel en cours de chargement. Le retour depuis les informations légales vers une URL sans fragment est corrigé.                                                                                         |
| `server/app.ts`                                                       | Le petit script de sélection du prérendu est autorisé par son empreinte SHA-256 dans la CSP locale, sans autoriser les scripts inline en général.                                                                                                                                                                                                        |

## Poids avant/après

Kio = 1 024 octets. Les transferts du rapport incluent les en-têtes ; les poids gzip de compilation peuvent donc différer légèrement. Les comparaisons de transfert après optimisation proviennent du serveur local, et devront être confirmées sur GitHub Pages.

| Ressource                  | Avant                                                                     | Après                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo                       | PNG 360 594 octets, **352,1 Kio**                                         | WebP **6,9 Kio à 2× / 10,8 Kio à 3×**, transparence préservée ; une variante téléchargée                                                        |
| Archivo                    | TTF **643,2 Kio brut**, **249,5 Kio transférés** dans PSI                 | **13,3 + 23,8 = 37,1 Kio** de WOFF2                                                                                                             |
| JavaScript public          | **723,1 Kio brut**, **212,9 Kio transférés** ; environ 153 Kio inutilisés | Environ **251,6 Kio brut / 82,9 Kio transférés au total**, amorçage et hydratation compris ; environ 35 Kio restent inutilisés selon Lighthouse |
| Amorçage avant hydratation | Application complète                                                      | **3,2 Ko brut / 1,6 Ko gzip** ; le formulaire est déjà dans le HTML                                                                             |
| CSS public                 | **43,3 Kio minifié**, environ 9 Kio gzip, requête bloquante               | **7,6 Kio minifié / 2,3 Kio gzip**, inclus dans le HTML ; aucune requête CSS initiale                                                           |
| HTML                       | Coque React vide                                                          | Environ **12,2 Kio brut / 4,1 Kio gzip**, incluant formulaire et CSS                                                                            |
| SDK Supabase               | Dans le bundle initial                                                    | **214 Ko brut / 55 Ko gzip**, chargé à la demande                                                                                               |
| Luxon / Zod et schémas     | Dans le bundle initial                                                    | **70 / 85 Ko brut**, chargés avec les fonctionnalités concernées                                                                                |
| CSS des autres écrans      | Initial                                                                   | Environ **44,6 Ko brut / 9,1 Ko gzip**, chargé avec ces écrans                                                                                  |

Le nombre de petits fichiers JS augmente avec le découpage, mais leurs dépendances sont préchargées ensemble par Vite au moment de l’import dynamique. L’écran public ne réimporte pas statiquement les écrans privés ; les vérifications du bundle contrôlent leurs requêtes réelles.

## Choix vérifiés par comparaison

Les essais locaux utilisent trois mobiles par variante, à code identique sauf la modification comparée. Ils ne constituent pas des garanties de gain sur tous les réseaux.

| Variante avant la correction finale d’ordonnancement  | FCP médian | LCP médian | CLS médian | Performance min./médiane |
| ----------------------------------------------------- | ---------- | ---------- | ---------- | ------------------------ |
| Aucun préchargement de police                         | 1,436 s    | 1,817 s    | 0,001105   | 99 / 99                  |
| Archivo du titre préchargé                            | 0,975 s    | 1,353 s    | 0,001105   | 99 / 100                 |
| Les deux faces utilisées au premier écran préchargées | 0,764 s    | 1,358 s    | 0          | 99 / 100                 |
| Face du titre intégrée dans le HTML                   | 1,288 s    | 1,816 s    | 0          | 99 / 99                  |

Les deux faces nécessaires au premier écran sont donc préchargées, aucune autre. L’intégration du fichier de police au HTML n’est pas retenue. Les fichiers complets de ces essais sont dans `.runtime/performance/no-preload/`, `final/`, `both-preloaded/` et `inline-display/`.

Le prérendu avec CSS critique et séparation de React évite la dépendance initiale aux gros modules. La dernière étape utilise deux `requestAnimationFrame` pour laisser réellement peindre le HTML public avant de commencer l’hydratation. Les audits contrôlent la marque `mesura:interactive` et le titre LCP ; le script vérifie aussi la saisie, l’affichage du mot de passe et la bascule de formulaire. Ces principes suivent la [documentation d’optimisation du LCP](https://web.dev/articles/optimize-lcp).

## Hébergement et limites

Les en-têtes effectivement reçus pour le JavaScript du site publié annoncent `Cache-Control: max-age=600`, soit dix minutes. GitHub Pages est un [hébergement statique](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) ; le projet n’a pas de contrôle serveur permettant de modifier cet en-tête. Un `.htaccess`, `_headers` ou une balise meta ne résoudrait pas ce point sur cet hébergement.

Les noms des bundles restent liés à leur contenu et le service worker conserve les ressources publiques pour les visites suivantes. Cela ne remplace pas une politique de cache HTTP et ne garantit pas un meilleur score en navigation froide. Une politique HTTP plus longue demanderait un hébergement configurable ou un proxy/CDN intermédiaire. Aucun changement d’hébergement n’a été effectué : son gain pour l’objectif n’est pas démontré.

React doit encore être téléchargé pour rendre les formulaires interactifs. Les métriques simulées locales ne reproduisent ni le TTFB ni le CDN de GitHub Pages. Trois bons résultats ne garantissent pas toutes les mesures futures. Aucun test de performance sur un vrai téléphone ou avec une session cloud réelle n’est revendiqué ; Auth et notifications sont simulés dans les tests de parcours.

## Reproduction

```sh
VITE_DEPLOYMENT=supabase VITE_BASE_PATH=/mesura/ npm run build
npm run test:pages
npm run audit:performance -- URL DOSSIER 3
```

Le serveur doit servir le bundle compilé sous `/mesura/`, compresser HTML/JS/CSS et répondre avec le bon type MIME. `npm run audit:performance` exécute les mesures séquentiellement dans des navigateurs neufs, enregistre JSON/HTML, vérifie l’écran utilisable et calcule minimum, médiane et maximum. Un quatrième argument `mobile` ou `desktop` permet un essai ciblé. Les polices se régénèrent séparément avec `scripts/optimize-fonts.py` et `fonttools[woff]==4.60.2` ; les binaires sont versionnés et Python n’est pas nécessaire au déploiement.

Après autorisation et mise en ligne : vérifier les fichiers déployés, réaliser au moins trois analyses PSI mobile et trois ordinateur sur la même version, archiver chaque lien et ses métriques, puis compléter ce document. L’objectif public ne sera validé qu’avec ces rapports.

## Résultats locaux de la version finale

Lighthouse 13.5.0, navigateur neuf, serveur statique local avec gzip et cache HTTP de 600 s. Audits séquentiels du 12 octobre 2026, de 15:42:28 à 15:43:20 UTC. Aucun avertissement Lighthouse. [Données et agrégats conservés](performance/2026-10-12-local.json). Les rapports HTML/JSON complets sont dans `.runtime/performance/final-confirmed/`.

| Format / rapport                                                              | Performance | Accessibilité | Bonnes pratiques | SEO | FCP (s) | LCP (s) | Speed Index (s) | TBT (ms) | CLS |
| ----------------------------------------------------------------------------- | ----------- | ------------- | ---------------- | --- | ------- | ------- | --------------- | -------- | --- |
| [Mobile 1](../.runtime/performance/final-confirmed/mobile-1.report.html)      | 100         | 100           | 100              | 100 | 0.812   | 1.201   | 0.812           | 8.5      | 0   |
| [Mobile 2](../.runtime/performance/final-confirmed/mobile-2.report.html)      | 100         | 100           | 100              | 100 | 0.752   | 1.352   | 0.752           | 0.0      | 0   |
| [Mobile 3](../.runtime/performance/final-confirmed/mobile-3.report.html)      | 100         | 100           | 100              | 100 | 0.758   | 1.353   | 0.758           | 0.0      | 0   |
| [Ordinateur 1](../.runtime/performance/final-confirmed/desktop-1.report.html) | 100         | 100           | 100              | 100 | 0.216   | 0.335   | 0.216           | 0.0      | 0   |
| [Ordinateur 2](../.runtime/performance/final-confirmed/desktop-2.report.html) | 100         | 100           | 100              | 100 | 0.202   | 0.322   | 0.202           | 0.0      | 0   |
| [Ordinateur 3](../.runtime/performance/final-confirmed/desktop-3.report.html) | 100         | 100           | 100              | 100 | 0.204   | 0.323   | 0.204           | 0.0      | 0   |

Dans chacun des deux formats, **minimum et médiane de chaque catégorie : 100/100**. Mobile : FCP médian 0,758 s, LCP médian 1,352 s, Speed Index médian 0,758 s, TBT médian 0 ms (maximum 8,5 ms), CLS 0. Ordinateur : FCP médian 0,204 s, LCP médian 0,323 s, Speed Index médian 0,204 s, TBT/CLS 0.

Les six rapports identifient le h1 attendu et la marque `mesura:interactive`. En complément, une observation CDP à 1,6 Mbit/s, latence 150 ms et CPU ×4 constate le premier contenu à 316 ms et le formulaire hydraté à **1,060 s** ; saisie et changement de formulaire fonctionnent. Cette observation n’est pas la simulation Lighthouse et ne prédit pas le TTFB de production.

La référence locale avant modification était à 72 en performance mobile, FCP 3,341 s et LCP 5,441 s. Son 96 en bonnes pratiques provenait du `/config` cloud bloqué par CORS sur cet hôte local ; il ne remplace pas le 100 du rapport PSI de référence. Aucun changement n’est présenté comme une correction de ce blocage artificiel de laboratoire.

Validation : compilation cloud et contrôles du bundle `/mesura/`, 148 tests unitaires/API/cloud/SQL, contrôle TypeScript de la fonction Edge, 30 parcours mobiles complets à 390/360 px. Après la correction du retour sans fragment, les quatre contrôles ciblés d’accès public/configuration et les smoke tests cloud ont été relancés avec succès. Quatre parcours WebKit ciblent accès public, configuration lente et inscription par étapes. Le sélecteur de 24 px du guide Safari déjà documenté reste une limite hors de ce démarrage ; aucun parcours Safari complet n’est revendiqué.

Le bundle final a aussi été parcouru sous Chromium et WebKit à 320, 390, 768 et 1 350 px : formulaire hydraté, action au clavier, ouverture et retour des conditions, focus du titre, connexion et absence de débordement/erreur JavaScript. Les captures mobile et ordinateur ont été inspectées ; la transparence et le cadrage du logo sont conservés.

La compilation du bundle local a également réussi. Son formulaire prérendu a été hydraté et utilisé sous la CSP réelle du serveur Fastify, sans erreur JavaScript ni violation CSP ; serveur et base temporaires isolés, sans email externe. Le bundle cloud mesuré a ensuite été restauré à l’identique pour la prévisualisation.
