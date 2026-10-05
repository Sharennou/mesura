import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  LogOut,
  Settings2,
  ShieldCheck,
  Target,
  UserRound,
  FileText,
} from "lucide-react";
import { useApp } from "../context";
import { Button, ErrorMessage, Icon, LinkCard, PageTitle } from "../components";
import { api, authClient } from "../api";
import type { AccountData } from "../../shared/types";
import { number, parseDecimal } from "../../shared/calculations";

export function ProfileScreen() {
  const { data, setData, navigate, toast } = useApp();
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(data.profile.name);
  const [height, setHeight] = useState(
    data.profile.height ? number(data.profile.height) : "",
  );
  const [timezone, setTimezone] = useState(data.profile.timezone);
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
    if (parsed !== null && !Number.isFinite(parsed)) {
      setError("La stature doit être un nombre strictement positif.");
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
            timezone,
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
  return (
    <>
      <PageTitle title="Mon espace" eyebrow="Tout commence par vous" />
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
          Pseudonyme
          <input
            required
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field-label">
          Stature en cm <span className="optional">Facultative</span>
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
        <label className="field-label">
          Fuseau horaire
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            list="timezones"
          />
          <datalist id="timezones">
            {[
              "Europe/Paris",
              "Europe/Brussels",
              "Europe/Zurich",
              "America/Montreal",
              "Indian/Reunion",
            ].map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <small>
            Pour changer l’heure des rappels, réenregistrez le rappel avec le
            fuseau souhaité.
          </small>
        </label>
        <button className="secondary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer mon profil"}
          <Icon as={Check} />
        </button>
        <ErrorMessage>{error}</ErrorMessage>
      </form>
      <div className="section-heading">
        <h2>Votre suivi, vos règles</h2>
      </div>
      <div className="stack">
        <LinkCard
          icon={Target}
          title="Mon objectif"
          description="Choisir, modifier ou retirer votre cap."
          onClick={() => navigate("goal")}
        />
        <LinkCard
          icon={Settings2}
          title="Mes mesures favorites"
          description="Choisir vos repères et leur ordre."
          onClick={() => navigate("favorites")}
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
      <section className="plain-card">
        <h2>Mes sessions</h2>
        <p>
          {sessions.length} session{sessions.length > 1 ? "s" : ""} ouverte
          {sessions.length > 1 ? "s" : ""}. Les connexions expirent après sept
          jours d’inactivité.
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
      </section>
      <Button
        onClick={async () => {
          await authClient.signOut();
          navigate("measure");
        }}
      >
        Me déconnecter
        <Icon as={LogOut} />
      </Button>
    </>
  );
}
