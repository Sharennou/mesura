import { useApp } from "../context";
import { PageTitle } from "../components";
import { CONSENT_VERSION, APP_NAME } from "../../shared/config";

export function LegalScreen() {
  const { capabilities } = useApp();
  return (
    <>
      <PageTitle
        title="En toute transparence"
        eyebrow="Informations du service"
      />
      <section className="plain-card prose">
        <h2>Politique de confidentialité</h2>
        <p>
          {APP_NAME} enregistre les informations nécessaires à votre compte :
          email, pseudonyme facultatif, fuseau horaire et préférences. Vos
          mesures, notes, stature et objectifs sont traités avec votre
          consentement explicite pour votre suivi personnel.
        </p>
        <p>
          Votre date de naissance et votre sexe sont demandés au démarrage et
          restent modifiables dans votre profil. Ces informations restent
          privées et incluses dans vos exports ; les calculs sont effectués dans
          votre navigateur.
        </p>
        <p>
          Les canaux de rappel sont facultatifs. Vos données ne sont ni
          publiques, ni utilisées pour la publicité ou une analyse par IA. Elles
          sont accessibles à votre compte et aux prestataires techniques
          nécessaires au service.
        </p>
        <p>
          Vous pouvez consulter, rectifier, exporter et supprimer vos données,
          ainsi que retirer chaque consentement. Le retrait du suivi efface les
          données corporelles actives. Le retrait d’un canal arrête ses rappels.
        </p>
        <p>
          Les données sont conservées pendant la vie du compte. Les journaux de
          livraison sont purgés après 30 jours. Les liens locaux de test
          expirent après 15 minutes. Les exports sont transmis directement sans
          copie temporaire sur le serveur.
        </p>
        <h2>Conditions d’utilisation</h2>
        <p>
          Le service propose des repères personnels et des calculs descriptifs.
          Il ne fournit ni diagnostic, ni conseil médical. Vos objectifs sont
          libres. Les projections sont conditionnelles et les notifications
          dépendent du téléphone et du réseau.
        </p>
        <p>
          Protégez votre accès, utilisez vos propres données et respectez les
          limites de fichiers. Vous pouvez fermer votre compte à tout moment.
        </p>
        <h2>Mentions légales</h2>
        <p>
          Cette version est destinée au développement. L’identité du
          responsable, l’hébergeur, les sous-traitants, les transferts, les
          conditions commerciales et le traitement des sauvegardes doivent être
          complétés et validés avant ouverture publique.
        </p>
        <p>
          Contact :{" "}
          {capabilities.privacyContact ||
            "à compléter par le responsable du service."}
        </p>
        <p>Texte de consentement : version {CONSENT_VERSION}.</p>
      </section>
    </>
  );
}
