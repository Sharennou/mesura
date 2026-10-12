import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Flag,
  LogOut,
  Ruler,
  ShieldCheck,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { EMPTY_TOOL_PROFILE, validDate } from "../../shared/body-tools";
import { onboardingSchema } from "../../shared/onboarding";
import { useApp } from "../context";
import { api, authClient } from "../api";
import { Button, ErrorMessage, Icon } from "../components";
import { CONSENT_TEXTS, CONSENT_VERSION } from "../../shared/config";
import { number, parseDecimal, localDate } from "../../shared/calculations";
import type { AccountData } from "../../shared/types";

type Step =
  | "height"
  | "birth"
  | "sex"
  | "goal"
  | "measure"
  | "start"
  | "target"
  | "consent";
const questions: Record<Step, { title: string; icon: LucideIcon }> = {
  height: { title: "Quelle est votre taille ?", icon: Ruler },
  birth: { title: "Quand êtes-vous né·e ?", icon: CalendarDays },
  sex: { title: "Quel est votre sexe ?", icon: UserRound },
  goal: { title: "Quel est votre objectif ?", icon: Target },
  measure: { title: "Que souhaitez-vous suivre ?", icon: Ruler },
  start: { title: "Quel est votre point de départ ?", icon: Flag },
  target: { title: "Quelle est votre cible ?", icon: Target },
  consent: { title: "Prêt·e à commencer ?", icon: ShieldCheck },
};

function ChoiceCard({
  name,
  value,
  title,
  description,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  title: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="onboarding-choice">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        aria-label={title}
      />
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function OnboardingScreen() {
  const { data, setData, navigate } = useApp();
  const [step, setStep] = useState<Step>("height");
  const questionRef = useRef<HTMLHeadingElement>(null);
  const [height, setHeight] = useState(
    data.profile.height ? number(data.profile.height) : "",
  );
  const [toolProfile, setToolProfile] = useState(
    data.profile.toolProfile ?? { ...EMPTY_TOOL_PROFILE },
  );
  const [sexAnswered, setSexAnswered] = useState(
    toolProfile.equation !== "unspecified",
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
  const measures = data.measures.filter((measure) => !measure.archived);
  const measure = measures.find((measure) => measure.id === measureId);
  const steps: Step[] = [
    "height",
    "birth",
    "sex",
    "goal",
    ...(choice === "observe" ? [] : (["measure", "start", "target"] as Step[])),
    "consent",
  ];
  const stepIndex = steps.indexOf(step);
  const question = questions[step];

  useEffect(() => {
    questionRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  function validationMessage(current: Step) {
    switch (current) {
      case "height": {
        const value = parseDecimal(height);
        return value === null ||
          !Number.isFinite(value) ||
          value <= 0 ||
          value > 300
          ? "Renseignez votre taille en centimètres, supérieure à 0 et jusqu’à 300."
          : null;
      }
      case "birth":
        if (!validDate(toolProfile.birthDate))
          return "Renseignez votre date de naissance.";
        return toolProfile.birthDate > today
          ? "La date de naissance ne peut pas être dans le futur."
          : null;
      case "sex":
        return sexAnswered ? null : "Choisissez une réponse pour continuer.";
      case "goal":
        return choice ? null : "Choisissez votre objectif pour continuer.";
      case "measure":
        return measure ? null : "Choisissez une mesure pour votre objectif.";
      case "start":
      case "target": {
        const value = parseDecimal(current === "start" ? start : target);
        return value === null ||
          !Number.isFinite(value) ||
          value <= 0 ||
          value > 100000
          ? "Renseignez une valeur supérieure à 0 et jusqu’à 100 000."
          : null;
      }
      case "consent":
        return consent
          ? null
          : "Cochez l’autorisation de suivi pour enregistrer ces informations.";
    }
  }

  function previous() {
    if (busy || stepIndex === 0) return;
    setError("");
    setStep(steps[stepIndex - 1]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const message = validationMessage(step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step !== "consent") {
      setStep(steps[stepIndex + 1]);
      return;
    }
    for (const current of steps) {
      const message = validationMessage(current);
      if (message) {
        setStep(current);
        setError(message);
        return;
      }
    }
    const setup = onboardingSchema.safeParse({
      height: parseDecimal(height),
      toolProfile,
      consent,
      version: CONSENT_VERSION,
      goal:
        choice === "target"
          ? {
              measureId,
              start: parseDecimal(start),
              target: parseDecimal(target),
            }
          : null,
    });
    if (!setup.success) {
      setError("Vérifiez les informations saisies.");
      return;
    }
    setBusy(true);
    try {
      const next = await api<AccountData>("/onboarding", {
        method: "POST",
        body: JSON.stringify(setup.data),
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
    <section className="onboarding-screen">
      <div className="onboarding-topline">
        {stepIndex > 0 && (
          <button
            type="button"
            className="circle"
            aria-label="Question précédente"
            onClick={previous}
            disabled={busy}
          >
            <Icon as={ArrowLeft} />
          </button>
        )}
        <div className="onboarding-progress-label">
          <p className="eyebrow">Votre point de départ</p>
          <span>
            Étape {stepIndex + 1} sur {steps.length}
          </span>
        </div>
      </div>
      <div
        className="onboarding-progress"
        role="progressbar"
        aria-label="Progression de l’inscription"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={stepIndex + 1}
        aria-valuetext={`Étape ${stepIndex + 1} sur ${steps.length}`}
      >
        {steps.map((current, index) => (
          <span
            key={current}
            className={index <= stepIndex ? "complete" : ""}
          />
        ))}
      </div>
      <form onSubmit={submit} noValidate className="onboarding-form">
        <div key={step} className="onboarding-question">
          <span className="onboarding-question-icon">
            <Icon as={question.icon} size={28} />
          </span>
          <h1 id="onboarding-question" ref={questionRef} tabIndex={-1}>
            {question.title}
          </h1>
          <fieldset disabled={busy} className="onboarding-answer">
            <legend className="sr-only">{question.title}</legend>
            {step === "height" && (
              <label className="field-label" htmlFor="onboarding-height">
                Votre hauteur en cm
                <div className="onboarding-number-field">
                  <input
                    id="onboarding-height"
                    required
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="175"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "onboarding-error" : undefined}
                    value={height}
                    onChange={(event) => {
                      setHeight(event.target.value);
                      setError("");
                    }}
                  />
                  <span aria-hidden="true">cm</span>
                </div>
              </label>
            )}
            {step === "birth" && (
              <label className="field-label">
                Date de naissance
                <input
                  type="date"
                  required
                  autoComplete="bday"
                  max={today}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "onboarding-error" : undefined}
                  value={toolProfile.birthDate ?? ""}
                  onChange={(event) => {
                    setToolProfile({
                      ...toolProfile,
                      birthDate: event.target.value || null,
                    });
                    setError("");
                  }}
                />
              </label>
            )}
            {step === "sex" && (
              <div
                className="onboarding-choices"
                role="radiogroup"
                aria-label="Sexe"
                aria-describedby={error ? "onboarding-error" : undefined}
              >
                {(
                  [
                    ["female", "Féminin"],
                    ["male", "Masculin"],
                    ["unspecified", "Je préfère ne pas répondre"],
                  ] as const
                ).map(([equation, title]) => (
                  <ChoiceCard
                    key={equation}
                    name="sex"
                    value={equation}
                    title={title}
                    checked={sexAnswered && toolProfile.equation === equation}
                    onChange={() => {
                      setSexAnswered(true);
                      setToolProfile({ ...toolProfile, equation });
                      setError("");
                    }}
                  />
                ))}
              </div>
            )}
            {step === "goal" && (
              <div
                className="onboarding-choices"
                role="radiogroup"
                aria-label="Votre objectif"
                aria-describedby={error ? "onboarding-error" : undefined}
              >
                <ChoiceCard
                  name="goal"
                  value="target"
                  title="Viser ou maintenir une cible"
                  description="Je choisis une valeur à atteindre."
                  checked={choice === "target"}
                  onChange={() => {
                    setChoice("target");
                    setError("");
                  }}
                />
                <ChoiceCard
                  name="goal"
                  value="observe"
                  title="Suivre mon évolution"
                  description="J’observe mes mesures, sans cible chiffrée."
                  checked={choice === "observe"}
                  onChange={() => {
                    setChoice("observe");
                    setError("");
                  }}
                />
              </div>
            )}
            {step === "measure" && (
              <label className="field-label">
                Mesure de mon objectif
                <select
                  value={measureId}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "onboarding-error" : undefined}
                  onChange={(event) => {
                    setMeasureId(event.target.value);
                    setStart("");
                    setTarget("");
                    setError("");
                  }}
                >
                  {measures.map((measure) => (
                    <option key={measure.id} value={measure.id}>
                      {measure.name} ({measure.unit})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(step === "start" || step === "target") && (
              <label className="field-label" htmlFor={`onboarding-${step}`}>
                {step === "start" ? "Mon départ" : "Ma cible"} ({measure?.unit})
                <div className="onboarding-number-field">
                  <input
                    id={`onboarding-${step}`}
                    required
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={measure?.unit === "kg" ? "75" : "90"}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "onboarding-error" : undefined}
                    value={step === "start" ? start : target}
                    onChange={(event) => {
                      (step === "start" ? setStart : setTarget)(
                        event.target.value,
                      );
                      setError("");
                    }}
                  />
                  <span aria-hidden="true">{measure?.unit}</span>
                </div>
              </label>
            )}
            {step === "consent" && (
              <label className="check-label onboarding-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "onboarding-error" : undefined}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    setError("");
                  }}
                />
                <span>{CONSENT_TEXTS.body}</span>
              </label>
            )}
          </fieldset>
        </div>
        <div className="onboarding-actions">
          <div id="onboarding-error">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
          <button type="submit" className="primary" disabled={busy}>
            {busy
              ? "Enregistrement…"
              : step === "consent"
                ? "Commencer mon suivi"
                : "Continuer"}
            <Icon as={ArrowRight} />
          </button>
        </div>
      </form>
      <Button
        className="onboarding-signout"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error)
              throw new Error("Impossible de vous déconnecter. Réessayez.");
            navigate("account");
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Me déconnecter <Icon as={LogOut} size={16} />
      </Button>
    </section>
  );
}
