import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  LogOut,
  Settings2,
  ShieldCheck,
  Target,
  UserRound,
  FileText,
  Bell,
} from "lucide-react";
import { useApp } from "../context";
import { Button, ErrorMessage, Icon, LinkCard, PageTitle } from "../components";
import { api, authClient } from "../api";
import type { AccountData } from "../../shared/types";
import { number, parseDecimal } from "../../shared/calculations";
import { CLOUD } from "../deployment";

export function ProfileScreen({
  editingProfile = false,
}: {
  editingProfile?: boolean;
}) {
  const { data, setData, navigate, toast } = useApp();
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(data.profile.name);
  const [height, setHeight] = useState(
    data.profile.height ? number(data.profile.height) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => {
    authClient.listSessions().then((r) => setSessions(r.data || []));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = parseDecimal(height);
    if (busy) return;
    if (parsed !== null && !Number.isFinite(parsed)) {
      setError("La hauteur doit être un nombre strictement positif.");
      return;
    }
    setBusy(true);
    try {
      setData(
        await api<AccountData>("/profile", {
          method: "PATCH",
          body: JSON.stringify({
            ...data.profile,
            name,
            height: parsed,
          }),
        }),
      );
      toast("Profil enregistré.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!editingProfile)
    return (
      <>
        <PageTitle title="Mon espace" />
        <div className="stack account-menu">
          <LinkCard
            icon={UserRound}
            title="Profil"
            description={`${data.profile.name} · pseudo et hauteur.`}
            onClick={() => navigate("profile")}
          />
          <LinkCard
            icon={Target}
            title="Objectifs"
            description="Choisir, modifier ou retirer votre cap."
            onClick={() => navigate("goal")}
          />
          <LinkCard
            icon={Settings2}
            title="Mesures favorites"
            description="Choisir vos mensurations et leur ordre."
            onClick={() => navigate("favorites")}
          />
          <LinkCard
            icon={Bell}
            title="Rappels"
            description="Horaires et notifications sur cet appareil."
            onClick={() => navigate("reminder")}
          />
          <LinkCard
            icon={ShieldCheck}
            title="Données et confidentialité"
            description="Consentements, export et suppression."
            onClick={() => navigate("privacy")}
          />
          <LinkCard
            icon={FileText}
            title="Informations du service"
            description="Confidentialité et conditions d’utilisation."
            onClick={() => navigate("legal")}
          />
        </div>
        <details className="optional-panel">
          <summary>Sessions et connexion</summary>
          <p className="small">
            {sessions.length} session(s) ouverte(s).{" "}
            {CLOUD
              ? "Vous pouvez fermer les autres connexions à votre compte."
              : "Les connexions expirent après sept jours d’inactivité."}
          </p>
          <Button
            onClick={async () => {
              const r = await authClient.revokeOtherSessions();
              if (r.error) {
                setError("Impossible de fermer les sessions. Réessayez.");
                return;
              }
              setSessions((await authClient.listSessions()).data || []);
              toast("Les autres sessions sont fermées.");
            }}
          >
            Fermer les autres sessions
          </Button>
        </details>
        <ErrorMessage>{error}</ErrorMessage>
        <Button
          onClick={async () => {
            await authClient.signOut();
            navigate("account");
          }}
        >
          Me déconnecter <Icon as={LogOut} />
        </Button>
      </>
    );
  return (
    <>
      <PageTitle title="Modifier mon profil" />
      <section className="profile-id">
        <span className="intro-icon">
          <Icon as={UserRound} size={30} />
        </span>
        <div>
          <h2>{data.profile.name}</h2>
          <p>{session?.user.email}</p>
        </div>
      </section>
      {!data.consents.body && (
        <LinkCard
          icon={ShieldCheck}
          title="Choisir mes consentements"
          description="Activez votre suivi personnel."
          onClick={() => navigate("privacy")}
        />
      )}
      <form onSubmit={submit} className="stack">
        <label className="field-label">
          Pseudo
          <input
            required
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field-label">
          Hauteur en cm <span className="optional">Facultative</span>
          <input
            inputMode="decimal"
            placeholder="Ex. 175,0"
            value={height}
            disabled={!data.consents.body}
            onChange={(e) => setHeight(e.target.value)}
          />
          <small>
            Votre hauteur corporelle, distincte du tour de taille. Une
            modification s’applique aux futures entrées.
          </small>
        </label>
        <button className="secondary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer mon profil"}
          <Icon as={Check} />
        </button>
        <ErrorMessage>{error}</ErrorMessage>
      </form>
    </>
  );
}
