import { useId, useState } from "react";
import { ageAt, type ToolProfile } from "../../shared/body-tools";

export function PersonalFields({
  value,
  onChange,
  maxDate,
  required = false,
  compact = false,
}: {
  value: ToolProfile;
  onChange: (value: ToolProfile) => void;
  maxDate: string;
  required?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const age = ageAt(value.birthDate, maxDate);
  const [sexAnswered, setSexAnswered] = useState(
    value.equation !== "unspecified",
  );
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
          autoComplete="bday"
          max={maxDate}
          value={value.birthDate ?? ""}
          onChange={(e) =>
            onChange({ ...value, birthDate: e.target.value || null })
          }
        />
        {!compact && (
          <small id={`${id}-birth-help`}>
            Votre âge est calculé à partir de votre date de naissance.
          </small>
        )}
      </label>
      {!compact && (
        <p className="small" role="status" aria-live="polite">
          Âge actuel :{" "}
          <strong>{age === null ? "Non renseigné" : `${age} ans`}</strong>.
        </p>
      )}
      <label className="field-label">
        Sexe
        <select
          required={required}
          aria-label="Sexe"
          value={required && !sexAnswered ? "" : value.equation}
          onChange={(e) => {
            setSexAnswered(true);
            onChange({
              ...value,
              equation: e.target.value as ToolProfile["equation"],
            });
          }}
        >
          {required && (
            <option value="" disabled>
              Choisir une réponse
            </option>
          )}
          <option value="unspecified">Non renseigné</option>
          <option value="male">Masculin</option>
          <option value="female">Féminin</option>
        </select>
      </label>
    </div>
  );
}
