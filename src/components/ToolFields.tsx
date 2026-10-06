import { useId } from "react";
import {
  EQUATION_LABELS,
  SITUATION_LABELS,
  PROTOCOL_LABELS,
  type ToolProfile,
  type ToolContext,
} from "../../shared/body-tools";
import { TOOL_SOURCES } from "../../shared/tool-sources";

export function EquationFields({
  value,
  onChange,
  maxDate,
}: {
  value: ToolProfile;
  onChange: (value: ToolProfile) => void;
  maxDate: string;
}) {
  const id = useId();
  return (
    <div className="stack">
      <label className="field-label">
        Date de naissance <span className="optional">Facultative</span>
        <input
          aria-label="Date de naissance"
          aria-describedby={`${id}-birth-help`}
          type="date"
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
      <label className="field-label">
        Équation pour le RFM et la dépense au repos
        <select
          aria-label="Équation pour le RFM et la dépense au repos"
          aria-describedby={`${id}-equation-help`}
          value={value.equation}
          onChange={(e) =>
            onChange({
              ...value,
              equation: e.target.value as ToolProfile["equation"],
            })
          }
        >
          {Object.entries(EQUATION_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <small id={`${id}-equation-help`}>
          Ces deux versions viennent des groupes féminins et masculins des
          études originales. Ce choix de calcul ne décrit pas votre identité de
          genre et n’est jamais déduit de votre profil. Si ces modèles ne
          conviennent pas à votre situation, laissez « Non renseigné » et
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
}: {
  value: ToolContext;
  onChange: (v: ToolContext) => void;
  date: string;
  height: string;
  setHeight: (v: string) => void;
}) {
  const id = useId();
  return (
    <details className="optional-panel tool-fields">
      <summary>Données pour les outils</summary>
      <p className="small">
        Ces informations concernent cette séance. Une correction ici reste
        propre à cette entrée. Les anciens protocoles ne sont pas présumés
        conformes.
      </p>
      <EquationFields
        value={value}
        maxDate={date}
        onChange={(v) => onChange({ ...value, ...v })}
      />
      <label className="field-label">
        Situation à la date de la séance
        <select
          aria-label="Situation à la date de la séance"
          aria-describedby={`${id}-situation-help`}
          value={value.situation}
          onChange={(e) =>
            onChange({
              ...value,
              situation: e.target.value as ToolContext["situation"],
            })
          }
        >
          {Object.entries(SITUATION_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <small id={`${id}-situation-help`}>
          Par exemple : œdèmes importants, amputation, maladie ou traitement
          modifiant fortement la composition corporelle. Mesura suspend les
          estimations et classifications dans ces situations, ainsi que pendant
          la grossesse ou l’allaitement.
        </small>
      </label>
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
      <label className="field-label">
        Date de mesure de la hauteur
        <input
          aria-label="Date de mesure de la hauteur"
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
        <select
          aria-label="Protocole du tour de taille"
          value={value.waistProtocol}
          onChange={(e) =>
            onChange({
              ...value,
              waistProtocol: e.target.value as ToolContext["waistProtocol"],
            })
          }
        >
          {Object.entries(PROTOCOL_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ProtocolGuide />
      <label className="field-label">
        Protocole de la mesure spécifique RFM
        <select
          aria-label="Protocole de la mesure spécifique RFM"
          value={value.rfmWaistProtocol}
          onChange={(e) =>
            onChange({
              ...value,
              rfmWaistProtocol: e.target
                .value as ToolContext["rfmWaistProtocol"],
            })
          }
        >
          <option value="unknown">Protocole inconnu</option>
          <option value="iliac-crest">
            Bord supérieur de la crête iliaque droite (RFM)
          </option>
        </select>
      </label>
      <ProtocolGuide rfm />
    </details>
  );
}
