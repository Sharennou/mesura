import { ArrowRight, LockKeyhole } from "lucide-react";
import { APP_NAME } from "../../shared/config";
import { Button, Icon, PageTitle } from "../components";
import { useApp } from "../context";

export function PreviewAccountScreen() {
  const { navigate } = useApp();
  return (
    <>
      <PageTitle
        title="Découvrez votre suivi."
        eyebrow="Aperçu · données fictives"
        back={false}
      />
      <section className="plain-card stack">
        <Icon as={LockKeyhole} size={30} />
        <h2>Un aperçu de {APP_NAME}</h2>
        <p>
          Parcourez les mesures, les courbes et les bilans avec les exemples
          proposés.
        </p>
        <p>
          Cette version de démonstration ne crée pas de compte et ne sauvegarde
          aucune mesure, note ou photo personnelle. Le suivi privé sera
          disponible dans l’application complète.
        </p>
        <Button onClick={() => navigate("analysis")}>
          Découvrir l’analyse <Icon as={ArrowRight} />
        </Button>
        <Button onClick={() => navigate("measure")}>Revenir aux mesures</Button>
      </section>
    </>
  );
}
