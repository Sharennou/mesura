# Dossier de confidentialité à compléter

Ce dossier prépare les documents de l’exploitant et décrit les mécanismes implémentés. Il ne certifie pas la conformité globale du futur service.

## Mentions et informations manquantes

- Identité, adresse, forme juridique, immatriculation et directeur de publication : **À COMPLÉTER**.
- Contact pour les données et DPO, si applicable : **À COMPLÉTER**, ainsi que `PRIVACY_CONTACT`.
- Hébergeur, lieux de stockage / sauvegarde, SMTP, accords et sous-traitants : **À COMPLÉTER**.
- Pays, transferts, garanties, public concerné, âge minimal et conditions commerciales : **À COMPLÉTER**.

## Qualification et validation

Poids, mensurations et ratios peuvent révéler des informations de santé selon leurs traitements et croisements. L’analyse doit porter sur les finalités réelles, conformément à la [définition de la CNIL](https://www.cnil.fr/fr/quest-ce-ce-quune-donnee-de-sante).

À valider avant publication : qualification des données, base légale et condition des données sensibles, nécessité d’une AIPD, éventuelles règles d’hébergement spécifiques et transferts internationaux. Un consentement coché ou un hébergement européen ne prouve pas une conformité générale.

## Registre proposé

| Finalité                            | Données                                                                 | Base proposée à valider                                          | Destinataires                               | Conservation                                               |
| ----------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Compte et accès                     | email, pseudonyme, hash de mot de passe, sessions et données techniques | Exécution du service ; intérêt légitime de sécurité à documenter | Exploitant, hébergeur, SMTP                 | Vie du compte / 24 mois d’inactivité ; non vérifié 7 jours |
| Suivi personnel                     | mesures, stature, notes, objectifs et dates                             | Consentement explicite ; régime des données sensibles à valider  | Utilisateur, exploitant habilité, hébergeur | Jusqu’au retrait, suppression ou purge d’inactivité        |
| Push facultatif                     | règle, fuseau, appareil et abonnement                                   | Consentement du canal                                            | Hébergeur et fournisseur push               | Jusqu’au retrait, désactivation ou expiration              |
| Email de rappel                     | email vérifié et règle                                                  | Consentement du canal                                            | SMTP retenu                                 | Jusqu’au retrait ou désactivation                          |
| Droits                              | rectifications, export en flux, choix et suppression                    | Obligations applicables et gestion des demandes à valider        | Utilisateur authentifié, exploitant         | Export non persistant ; choix pendant le compte            |
| Respect des suppressions restaurées | identifiant opaque et date                                              | Intérêt légitime / respect de la suppression à valider           | Exploitant                                  | Ledger 35 jours pour sauvegardes 30 jours                  |

Le recours au consentement doit être adapté et démontrable selon les [principes de la CNIL](https://www.cnil.fr/fr/les-bases-legales/consentement). Les durées sont des décisions de cette version, pas des durées légales universelles ; revoir leur justification selon les [principes de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).

## Flux et sous-traitants

1. Navigateur → API HTTPS : compte et données explicitement saisies.
2. API → SQLite : sources, préférences, choix, règles et abonnements.
3. API → SMTP : vérification / récupération ; rappel uniquement si choisi.
4. Worker → fournisseur push : abonnement et texte discret, sans information corporelle.
5. API → navigateur authentifié : export immédiat en JSON, CSV ou ZIP de données.

Il n’y a ni publicité, ni analytics publicitaire, ni police distante, ni analyse d’image par IA. Lister les prestataires effectivement retenus, accords, mesures de sécurité, pays et sous-traitants ultérieurs. Les bibliothèques locales ne reçoivent pas automatiquement les données.

## Politique à publier

Le responsable **[identité, contact]** fournit **[nom du service]** pour un suivi personnel. Le compte conserve email, pseudonyme facultatif et préférences. Le suivi utilise les valeurs et notes choisies ; les rappels ont des consentements distincts. Les données restent privées, sans publication, publicité ou analyse des images.

Décrire **[hébergeur, SMTP, pays, transferts et garanties]**, **[durées confirmées]** et **[sauvegardes réelles]**. La personne peut consulter, rectifier, exporter, supprimer et retirer ses choix dans « Données et confidentialité ». Publier **[contact]**, les droits réellement applicables et les voies de réclamation auprès de l’autorité compétente.

## Conditions à publier

Mesura fournit des repères descriptifs ; les calculs ne constituent pas un diagnostic. Les objectifs sont personnels et les projections conditionnelles. La réception d’une notification n’est pas garantie à la seconde.

La personne protège son accès, utilise ses propres données et respecte formats et limites. Elle peut supprimer son compte. Compléter **[conditions d’accès, âge, support, disponibilité, responsabilités, paiements éventuels, modifications et droit applicable]**. La facturation n’est pas implémentée.

## Consentements et demandes

Les cases sont non précochées ; les finalités sont séparées des conditions. Chaque événement contient texte, version, date et statut. La permission du navigateur est distincte du choix du service.

Le refus principal empêche la collecte serveur et laisse la présentation accessible. Refuser les rappels conserve le suivi principal ; le retrait d’un canal annule ses futurs envois ; le retrait principal efface les sources corporelles et les options, après confirmation.

Pour une demande : authentifier la personne sans collecte excessive, proposer l’export, rectifier ou effacer les sources et images, révoquer sessions / tâches et vérifier le ledger. Les bilans ne possèdent pas de copie persistante. Traiter les sauvegardes selon la politique confirmée et toute conservation légale distincte réellement nécessaire. Répondre via le contact avec les modalités et délais applicables, en conservant seulement la preuve justifiée.

Avant ouverture : compléter les documents, vérifier chiffrement et restauration, valider qualification, transferts et analyse d’impact. Le [guide RGPD du développeur de la CNIL](https://www.cnil.fr/fr/guide-rgpd-du-developpeur) fournit un cadre pour cette revue.

Depuis le 6 octobre 2026, aucun nouvel envoi de photo ni d’avatar n’est accepté. Les anciens fichiers restent privés et sont nettoyés lors du retrait du suivi, de la suppression d’une entrée ou du compte.
