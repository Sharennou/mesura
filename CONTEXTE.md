# Contexte de Mesura

Dernière mise à jour : 6 octobre 2026.

Mesura est une application web de suivi corporel conçue pour le téléphone, entièrement en français. Le projet existe déjà et est publié : les prochaines modifications doivent prolonger cette application et ses données réelles.

## Documents à lire

- [Produit et parcours](docs/contexte-produit.md) : fonctionnalités et comportement attendu.
- [Décisions d’interface](docs/decisions-interface.md) : préférences validées et éléments retirés.
- [État technique et reprise du travail](docs/etat-projet.md) : fichiers, déploiement, commandes et limites connues.
- [Architecture](docs/architecture.md), [déploiement](docs/deploiement.md), [calculs](docs/calculs.md), [exploitation](docs/exploitation.md), [confidentialité](docs/confidentialite.md) et [vérifications](docs/verification.md) : détails spécialisés.

## Repères essentiels

- Application : https://sharennou.github.io/mesura/ ; dépôt : `Sharennou/mesura`, branche `main`.
- Production : GitHub Pages + Supabase Free. Version locale : Fastify + SQLite + Better Auth.
- Deux destinations principales : Mesures (saisie et historique) et Analyse (évolution et comparaison).
- Analyse : sélection de plusieurs mesures, comparaison en pourcentage avec valeurs exactes par date, IMC et ratios directement sous le graphique. Périodes 3M, 6M, 1A, MAX ; menus « Les autres mesures » et indicateurs retirés.
- Refonte UX en développement : [diagnostic et validation](docs/ux-parcours.md), états d’analyse selon les données, détail distinct de l’édition, retours et brouillons conservés en mémoire. Cette session n’est pas publiée.
- Compte obligatoire, aucune donnée fictive dans les comptes ordinaires, aucune confirmation d’email à l’inscription.
- Compte de développement dédié autorisé par le propriétaire : « Développement · données fictives », 30 entrées et 383 valeurs injectées par `scripts/seed-development-account.ts`. Identifiants privés dans `.runtime`, jamais dans la documentation.
- Après inscription : connexion immédiate, puis taille et objectifs avant le suivi.
- Historique en bas de Mesures ; guide en trois étapes courtes, sans « À éviter » ni « Bien mesurer à chaque séance », avec sources.
- Favoris ordonnés par glisser-déposer, à la souris ou au doigt, avec commande au clavier.
- Fonction photo retirée, à l’exception de la photo de profil, avec retrait des options d’export d’images. Nouveaux envois de photos de mesures refusés ; anciennes données conservées privées jusqu’au nettoyage habituel.
- Les rappels proposés sont hebdomadaires, avec plusieurs jours possibles et une heure commune.
- Nom centralisé dans `shared/config.ts`. Logo fourni dans `src/assets/mesura-logo.png`.

Ces documents décrivent la version actuelle. Pour un travail futur, les instructions nouvelles du propriétaire et le code effectivement présent prennent priorité sur une information documentaire devenue obsolète. Mettre à jour le contexte après une modification du parcours ou du déploiement. Ne jamais y enregistrer de mots de passe, clés privées, jetons ou données personnelles d’utilisateurs.
