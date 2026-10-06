import { EquationFields } from "../components/ToolFields";
import { EMPTY_TOOL_PROFILE, validDate } from "../../shared/body-tools";
import { useState, type FormEvent } from "react";
import { ArrowRight, LogOut } from "lucide-react";
import { useApp } from "../context";
import { api, authClient } from "../api";
import { Button, ErrorMessage, Icon, PageTitle } from "../components";
import { CONSENT_TEXTS, CONSENT_VERSION } from "../../shared/config";
import { number, parseDecimal, localDate } from "../../shared/calculations";
import type { AccountData } from "../../shared/types";

export function OnboardingScreen() {
  const { data, setData, navigate } = useApp();
  const [height, setHeight] = useState(
    data.profile.height ? number(data.profile.height) : "",
  );
  const [toolProfile, setToolProfile] = useState(
    data.profile.toolProfile ?? { ...EMPTY_TOOL_PROFILE },
  );
  const today = localDate(data.profile.timezone);
  const [choice, setChoice] = useState(data.goal ? "target" : "");
  const [measureId, setMeasureId] = useState(data.goal?.measureId || "weight");
  const [start, setStart] = useState(data.goal ? number(data.goal.start) : "");
  const [target, setTarget] = useState(
    data.goal ? number(data.goal.target) : "",
  );
  const [consent, setConsent] = useState(data.consents.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unit = data.measures.find((m) => m.id === measureId)?.unit;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const h = parseDecimal(height),
      a = parseDecimal(start),
      b = parseDecimal(target);
    if (h === null || !Number.isFinite(h) || h > 300) {
      setError("Renseignez votre taille en centimètres, entre 0 et 300.");
      return;
    }
    if (
      !choice ||
      (choice === "target" &&
        (a === null ||
          b === null ||
          !Number.isFinite(a) ||
          !Number.isFinite(b)))
    ) {
      setError(
        "Choisissez votre objectif et renseignez un départ et une cible si nécessaire.",
      );
      return;
    }
    if (
      toolProfile.birthDate &&
      (!validDate(toolProfile.birthDate) || toolProfile.birthDate > today)
    ) {
      setError(
        "Vérifiez votre date de naissance : elle doit être valide et ne pas être dans le futur.",
      );
      return;
    }
    if (!consent) {
      setError(
        "Cochez l’autorisation de suivi pour enregistrer ces informations.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await api<AccountData>("/onboarding", {
        method: "POST",
        body: JSON.stringify({
          height: h,
          toolProfile,
          consent,
          version: CONSENT_VERSION,
          goal: choice === "target" ? { measureId, start: a, target: b } : null,
        }),
      });
      setData(next);
      navigate("measure");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Votre point de départ."
        eyebrow="Bienvenue dans votre espace"
        back={false}
      />
      <p className="lead">
        Votre hauteur, votre âge, le sexe utilisé pour les calculs et votre cap.
        Ces repères restent modifiables dans votre profil.
      </p>
      <form onSubmit={submit} className="stack">
        <label className="field-label">
          Votre hauteur en cm
          <input
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ex. 175"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
          <small>
            Votre hauteur, pour calculer l’IMC. Ce n’est pas votre tour de
            taille.
          </small>
        </label>
        <section
          className="stack"
          aria-labelledby="onboarding-calculations-title"
        >
          <h2 id="onboarding-calculations-title">
            Âge et sexe pour les calculs
          </h2>
          <EquationFields
            profile
            value={toolProfile}
            onChange={setToolProfile}
            maxDate={today}
          />
          <p className="small muted">
            Ces informations complètent les nouvelles séances. Si vous les
            laissez non renseignées, les outils qui en dépendent resteront
            indisponibles.
          </p>
        </section>
        <label className="field-label">
          Votre objectif
          <select
            required
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="" disabled>
              Choisir mon cap
            </option>
            <option value="target">Atteindre ou maintenir une cible</option>
            <option value="observe">
              Suivre mon évolution sans cible chiffrée
            </option>
          </select>
        </label>
        {choice === "target" && (
          <>
            <label className="field-label">
              Mesure de mon objectif
              <select
                value={measureId}
                onChange={(e) => {
                  setMeasureId(e.target.value);
                  setStart("");
                  setTarget("");
                }}
              >
                {data.measures
                  .filter((m) => !m.archived)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
              </select>
            </label>
            <div className="two-fields">
              <label className="field-label">
                Mon départ ({unit})
                <input
                  required
                  inputMode="decimal"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="field-label">
                Ma cible ({unit})
                <input
                  required
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
            </div>
            <p className="small muted">
              Pour maintenir votre mesure, indiquez la même valeur au départ et
              à la cible.
            </p>
          </>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{CONSENT_TEXTS.body}</span>
        </label>
        <p className="small muted">
          Les rappels sont facultatifs. Vous pourrez les activer quand vous en
          aurez besoin.
        </p>
        <ErrorMessage>{error}</ErrorMessage>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Enregistrement…" : "Commencer mon suivi"}
          <Icon as={ArrowRight} />
        </button>
      </form>
      <Button
        disabled={busy}
        onClick={async () => {
          await authClient.signOut();
          navigate("account");
        }}
      >
        Me déconnecter
        <Icon as={LogOut} />
      </Button>
    </>
  );
}
