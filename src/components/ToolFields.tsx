import { useId, useState, type ReactNode } from "react";
import {
  EQUATION_LABELS,
  ageAt,
  SITUATION_LABELS,
  PROTOCOL_LABELS,
  type ToolProfile,
  type ToolContext,
} from "../../shared/body-tools";
import { TOOL_SOURCES } from "../../shared/tool-sources";

function ToolSelect({
  value,
  unknown,
  required = false,
  children,
  onChange,
  ...props
}: {
  value: string;
  unknown: string;
  required?: boolean;
  children: ReactNode;
  onChange: (value: string) => void;
  "aria-label": string;
  "aria-describedby"?: string;
}) {
  const [answered, setAnswered] = useState(value !== unknown);
  return (
    <select
      {...props}
      required={required}
      value={required && !answered ? "" : value}
      onChange={(e) => {
        setAnswered(true);
        onChange(e.target.value);
      }}
    >
      {required && (
        <option value="" disabled>
          Choisir une réponse
        </option>
      )}
      {children}
    </select>
  );
}

export function EquationFields({
  value,
  onChange,
  maxDate,
  profile = false,
  required = false,
}: {
  value: ToolProfile;
  onChange: (value: ToolProfile) => void;
  maxDate: string;
  profile?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const age = ageAt(value.birthDate, maxDate);
  const equationLabel = profile
    ? "Sexe utilisé pour les calculs"
    : "Équation pour le RFM et la dépense au repos";
  return (
    <div className="stack">
      <label className="field-label">
        Date de naissance{" "}
        {!required && <span className="optional">Facultative</span>}
        <input
          aria-label="Date de naissance"
          aria-describedby={`${id}-birth-help`}
          type="date"
          required={required}
          autoComplete={profile ? "bday" : "off"}
          max={maxDate}
          value={value.birthDate ?? ""}
          onChange={(e) =>
            onChange({ ...value, birthDate: e.target.value || null })
          }
        />
        <small id={`${id}-birth-help`}>
          L’âge sera calculé à la date de chaque séance.
        </small>
      </label>
      {profile && (
        <p className="small" role="status" aria-live="polite">
          Âge actuel :{" "}
          <strong>{age === null ? "Non renseigné" : `${age} ans`}</strong>.
          {!value.birthDate &&
            " Renseignez votre date de naissance pour les calculs qui nécessitent l’âge."}
        </p>
      )}
      <label className="field-label">
        {equationLabel}
        <ToolSelect
          required={required}
          unknown="unspecified"
          aria-label={equationLabel}
          aria-describedby={`${id}-equation-help`}
          value={value.equation}
          onChange={(equation) =>
            onChange({
              ...value,
              equation: equation as ToolProfile["equation"],
            })
          }
        >
          {Object.entries(EQUATION_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {profile && id !== "unspecified"
                ? `${id === "male" ? "Masculin" : "Féminin"} — ${label.toLocaleLowerCase("fr")}`
                : required && id === "unspecified"
                  ? "Ne pas utiliser ces équations"
                  : label}
            </option>
          ))}
        </ToolSelect>
        <small id={`${id}-equation-help`}>
          Ces deux versions viennent des groupes féminins et masculins des
          études originales. Ce choix de calcul ne décrit pas votre identité de
          genre et n’est jamais déduit de votre profil. Si ces modèles ne
          conviennent pas à votre situation, choisissez «{" "}
          {required ? "Ne pas utiliser ces équations" : "Non renseigné"} » et
          demandez un avis adapté.
        </small>
      </label>
    </div>
  );
}
export function ProtocolGuide({ rfm = false }: { rfm?: boolean }) {
  return (
    <details className="optional-panel">
      <summary>
        {rfm ? "Guide de mesure pour le RFM" : "Guide du tour de taille — NICE"}
      </summary>
      <ol>
        <li>
          {rfm
            ? "Repérez, sur le côté droit, le bord supérieur de la crête iliaque (le haut de l’os du bassin)."
            : "Repérez le bas de la dernière côte et le haut de la crête iliaque. Choisissez le milieu entre ces deux points."}
        </li>
        <li>
          Debout, sur peau nue, placez le ruban horizontalement autour du tronc,
          au niveau du repère. Gardez le ventre relâché, sans comprimer la peau.
        </li>
        <li>
          Lisez la mesure à la fin d’une expiration naturelle, sans rentrer le
          ventre. Enregistrez la valeur en centimètres et indiquez le protocole
          utilisé.
        </li>
      </ol>
      <p className="small">
        Les deux repères sont différents : une mesure NICE ne remplace pas la
        mesure spécifique au RFM.
      </p>
      <a
        href={rfm ? TOOL_SOURCES.rfm.url : TOOL_SOURCES.nice.url}
        target="_blank"
        rel="noreferrer"
      >
        {rfm ? "Publication et protocole RFM" : "Méthode NICE"} (nouvel onglet)
      </a>
    </details>
  );
}
export function SessionToolFields({
  value,
  onChange,
  date,
  height,
  setHeight,
  onboarding = false,
  profile = false,
}: {
  value: ToolContext;
  onChange: (v: ToolContext) => void;
  date: string;
  height: string;
  setHeight: (v: string) => void;
  onboarding?: boolean;
  profile?: boolean;
}) {
  const id = useId();
  const defaults = onboarding || profile;
  const heightDateLabel = profile
    ? "Date de mesure de la hauteur du profil"
    : "Date de mesure de la hauteur";
  const fields = (
    <>
      <p className="small">
        {defaults ? (
          `${onboarding ? "Renseignez chaque champ. " : ""}Ces repères seront repris dans vos nouvelles séances et pourront être corrigés pour chaque mesure.`
        ) : (
          <>
            Ces informations concernent cette séance. Une correction ici reste
            propre à cette entrée. Les anciens protocoles ne sont pas présumés
            conformes.
          </>
        )}
      </p>
      <EquationFields
        profile={defaults}
        required={onboarding}
        value={value}
        maxDate={date}
        onChange={(v) => onChange({ ...value, ...v })}
      />
      <label className="field-label">
        {defaults
          ? "Votre situation actuelle"
          : "Situation à la date de la séance"}
        <ToolSelect
          required={onboarding}
          unknown="unknown"
          aria-label={
            defaults
              ? "Votre situation actuelle"
              : "Situation à la date de la séance"
          }
          aria-describedby={`${id}-situation-help`}
          value={value.situation}
          onChange={(situation) =>
            onChange({
              ...value,
              situation: situation as ToolContext["situation"],
            })
          }
        >
          {Object.entries(SITUATION_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {onboarding && id === "unknown" ? "Je ne sais pas" : label}
            </option>
          ))}
        </ToolSelect>
        <small id={`${id}-situation-help`}>
          Par exemple : œdèmes importants, amputation, maladie ou traitement
          modifiant fortement la composition corporelle. Mesura suspend les
          estimations et classifications dans ces situations, ainsi que pendant
          la grossesse ou l’allaitement.
        </small>
      </label>
      {!defaults && (
        <label className="field-label">
          Hauteur corporelle de cette séance, en cm
          <input
            aria-label="Hauteur corporelle de cette séance, en cm"
            aria-describedby={`${id}-height-help`}
            inputMode="decimal"
            value={height}
            onChange={(e) => {
              setHeight(e.target.value);
              onChange({ ...value, heightOrigin: "session" });
            }}
          />
          <small id={`${id}-height-help`}>
            {value.heightOrigin === "profile"
              ? "Valeur reprise du profil : vérifiez qu’elle était déjà mesurée à cette date."
              : value.heightOrigin === "legacy"
                ? "Valeur historique conservée ; date de mesure initiale inconnue si non renseignée."
                : "Valeur renseignée pour cette séance."}
          </small>
        </label>
      )}
      <label className="field-label">
        {heightDateLabel}
        <input
          aria-label={heightDateLabel}
          aria-describedby={`${id}-date-help`}
          type="date"
          required={onboarding}
          max={date}
          value={value.heightDate ?? ""}
          onChange={(e) =>
            onChange({ ...value, heightDate: e.target.value || null })
          }
        />
        <small id={`${id}-date-help`}>
          Une hauteur antérieure peut être reprise. Aucune hauteur mesurée après
          cette séance n’est utilisée.
        </small>
      </label>
      <label className="field-label">
        Protocole du tour de taille
        <ToolSelect
          required={onboarding}
          unknown="unknown"
          aria-label="Protocole du tour de taille"
          value={value.waistProtocol}
          onChange={(waistProtocol) =>
            onChange({
              ...value,
              waistProtocol: waistProtocol as ToolContext["waistProtocol"],
            })
          }
        >
          {Object.entries(PROTOCOL_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </ToolSelect>
      </label>
      <ProtocolGuide />
      <label className="field-label">
        Protocole de la mesure spécifique RFM
        <ToolSelect
          required={onboarding}
          unknown="unknown"
          aria-label="Protocole de la mesure spécifique RFM"
          value={value.rfmWaistProtocol}
          onChange={(rfmWaistProtocol) =>
            onChange({
              ...value,
              rfmWaistProtocol:
                rfmWaistProtocol as ToolContext["rfmWaistProtocol"],
            })
          }
        >
          <option value="unknown">
            {onboarding
              ? "Je n’utilise pas cette mesure pour le moment"
              : "Protocole inconnu"}
          </option>
          <option value="iliac-crest">
            Bord supérieur de la crête iliaque droite (RFM)
          </option>
        </ToolSelect>
      </label>
      <ProtocolGuide rfm />
    </>
  );
  return defaults ? (
    <section className="stack tool-fields" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Données pour les outils</h2>
      {fields}
    </section>
  ) : (
    <details className="optional-panel tool-fields">
      <summary>Données pour les outils</summary>
      {fields}
    </details>
  );
}
