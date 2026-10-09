import { useId, useState, type ReactNode } from "react";
import {
  EQUATION_LABELS,
  ageAt,
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
  compact = false,
}: {
  value: ToolProfile;
  onChange: (value: ToolProfile) => void;
  maxDate: string;
  profile?: boolean;
  required?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const age = ageAt(value.birthDate, maxDate);
  const equationLabel = profile
    ? "Sexe utilisé pour les calculs"
    : "Équation pour la dépense au repos";
  return (
    <div className="stack">
      <label className="field-label">
        Date de naissance{" "}
        {!required && <span className="optional">Facultative</span>}
        <input
          aria-label="Date de naissance"
          aria-describedby={compact ? undefined : `${id}-birth-help`}
          type="date"
          required={required}
          autoComplete={profile ? "bday" : "off"}
          max={maxDate}
          value={value.birthDate ?? ""}
          onChange={(e) =>
            onChange({ ...value, birthDate: e.target.value || null })
          }
        />
        {!compact && (
          <small id={`${id}-birth-help`}>
            L’âge sera calculé à la date de chaque séance.
          </small>
        )}
      </label>
      {profile && !compact && (
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
          aria-describedby={compact ? undefined : `${id}-equation-help`}
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
                ? compact
                  ? id === "male"
                    ? "Masculin"
                    : "Féminin"
                  : `${id === "male" ? "Masculin" : "Féminin"} — ${label.toLocaleLowerCase("fr")}`
                : required && id === "unspecified"
                  ? "Ne pas utiliser ces équations"
                  : label}
            </option>
          ))}
        </ToolSelect>
        {!compact && (
          <small id={`${id}-equation-help`}>
            Ces deux versions viennent des groupes féminins et masculins des
            études originales. Ce choix de calcul ne décrit pas votre identité
            de genre et n’est jamais déduit de votre profil. Si ces modèles ne
            conviennent pas, choisissez «{" "}
            {required ? "Ne pas utiliser ces équations" : "Non renseigné"} » et
            demandez un avis adapté.
          </small>
        )}
      </label>
    </div>
  );
}
export function ProtocolGuide() {
  return (
    <details className="optional-panel">
      <summary>Guide du tour de taille — NICE</summary>
      <ol>
        <li>
          Repérez le bas de la dernière côte et le haut de la crête iliaque.
          Choisissez le milieu entre ces deux points.
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
      <a href={TOOL_SOURCES.nice.url} target="_blank" rel="noreferrer">
        Méthode NICE (nouvel onglet)
      </a>
    </details>
  );
}
export function ProfileToolFields({
  value,
  onChange,
  date,
}: {
  value: ToolContext;
  onChange: (v: ToolContext) => void;
  date: string;
}) {
  const id = useId();
  const heightDateLabel = "Date de mesure de la hauteur du profil";
  const fields = (
    <>
      <EquationFields
        profile
        value={value}
        maxDate={date}
        onChange={(v) => onChange({ ...value, ...v })}
      />
      <label className="field-label">
        {heightDateLabel}
        <input
          aria-label={heightDateLabel}
          aria-describedby={`${id}-date-help`}
          type="date"
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
    </>
  );
  return (
    <section className="stack tool-fields" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Données pour les outils</h2>
      {fields}
    </section>
  );
}
