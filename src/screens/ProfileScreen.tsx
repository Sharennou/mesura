import { EquationFields } from "../components/ToolFields";
import { EMPTY_TOOL_PROFILE } from "../../shared/body-tools";
import { localDate } from "../../shared/calculations";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { inputDecimal, parseDecimal } from "../../shared/calculations";
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
    data.profile.height ? inputDecimal(data.profile.height) : "",
  );
  const [toolProfile, setToolProfile] = useState(
    data.profile.toolProfile ?? { ...EMPTY_TOOL_PROFILE },
  );
  const [heightDate, setHeightDate] = useState(data.profile.heightDate ?? "");
  const [avatar, setAvatar] = useState(data.profile.avatar ?? null);
  const photoInput = useRef<HTMLInputElement>(null);
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
            avatar,
            ...(data.consents.body
              ? { toolProfile, heightDate: heightDate || null }
              : {}),
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
            description={`${data.profile.name} · pseudo, hauteur et photo.`}
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
        <span className={`intro-icon ${avatar ? "has-avatar" : ""}`}>
          {avatar ? (
            <img
              className="profile-avatar"
              src={avatar}
              alt="Votre photo de profil"
            />
          ) : (
            <Icon as={UserRound} size={30} />
          )}
        </span>
        <div>
          <h2>{data.profile.name}</h2>
          <p>{session?.user.email}</p>
        </div>
      </section>
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError("");
          try {
            if (file.size > 10 * 1024 * 1024)
              throw new Error("Photo trop volumineuse. Maximum : 10 Mo.");
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
              throw new Error("Choisissez une photo JPEG, PNG ou WebP.");
            const bitmap = await createImageBitmap(file, {
              imageOrientation: "from-image",
            });
            try {
              if (bitmap.width * bitmap.height > 40_000_000)
                throw new Error(
                  "La résolution de cette photo est trop grande.",
                );
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 192;
              const ctx = canvas.getContext("2d")!;
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, 192, 192);
              const size = Math.min(bitmap.width, bitmap.height);
              ctx.drawImage(
                bitmap,
                (bitmap.width - size) / 2,
                (bitmap.height - size) / 2,
                size,
                size,
                0,
                0,
                192,
                192,
              );
              const image = canvas.toDataURL("image/jpeg", 0.8);
              if (image.length > 50000)
                throw new Error(
                  "Cette photo est trop détaillée. Choisissez une autre image.",
                );
              setAvatar(image);
            } finally {
              bitmap.close();
            }
          } catch (err: any) {
            setError(err.message || "Cette photo ne peut pas être lue.");
          }
        }}
      />
      <div className="profile-photo-actions">
        <Button disabled={busy} onClick={() => photoInput.current?.click()}>
          Changer ma photo de profil
        </Button>
        {avatar && (
          <Button disabled={busy} onClick={() => setAvatar(null)}>
            Retirer la photo
          </Button>
        )}
        <p className="muted small">
          La photo sera sauvegardée avec « Enregistrer mon profil ».
        </p>
      </div>
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
            onChange={(e) => {
              setHeight(e.target.value);
              setHeightDate("");
            }}
          />
          <small>
            Votre hauteur corporelle, distincte du tour de taille. Une
            modification s’applique aux futures entrées. Après un changement,
            précisez sa date de mesure dans les réglages des outils ci-dessous.
          </small>
        </label>
        {data.consents.body && (
          <details className="optional-panel">
            <summary>Préparer les outils des prochaines séances</summary>
            <label className="field-label">
              Date de mesure de la hauteur du profil
              <input
                type="date"
                max={localDate(data.profile.timezone)}
                value={heightDate}
                onChange={(e) => setHeightDate(e.target.value)}
              />
            </label>
            <EquationFields
              value={toolProfile}
              onChange={setToolProfile}
              maxDate={localDate(data.profile.timezone)}
            />
            <p className="small">
              Ces réglages seront proposés aux nouvelles séances. Les entrées
              déjà enregistrées restent inchangées.
            </p>
          </details>
        )}
        <button className="secondary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer mon profil"}
          <Icon as={Check} />
        </button>
        <ErrorMessage>{error}</ErrorMessage>
      </form>
    </>
  );
}
