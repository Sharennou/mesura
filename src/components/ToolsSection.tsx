import type { ReactNode } from "react";
import type { Entry } from "../../shared/types";
import { useApp } from "../context";
import { useViewState } from "../useViewState";
import { number, delta, localDate } from "../../shared/calculations";
import {
  ABDOMINAL_LABELS,
  ABDOMINAL_THRESHOLDS,
  ABDOMINAL_BMI_LIMIT,
  BMI_THRESHOLDS,
  entryTools,
  orderedSessions,
  thresholdNumber,
} from "../../shared/body-tools";
import { BmiZone } from "./BmiZone";

function sessionDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function Card({
  id,
  title,
  value,
  unit = "",
  explanation,
  reason,
  children,
  variation,
}: {
  id: string;
  title: string;
  value: string | null;
  unit?: string;
  explanation?: string;
  reason?: string | null;
  children: ReactNode;
  variation?: ReactNode;
}) {
  return (
    <article
      className="plain-card tool-card indicator-detail"
      aria-labelledby={`tool-${id}`}
    >
      <h3 id={`tool-${id}`}>{title}</h3>
      <p className="tool-value">
        <strong>{value ?? "Non disponible"}</strong>
        {value !== null && unit && <span> {unit}</span>}
      </p>
      {explanation && (
        <p className="small indicator-explanation">{explanation}</p>
      )}
      {reason && <p className="tool-state">{reason}</p>}
      {variation}
      {children}
    </article>
  );
}
export function ToolsSection({
  entries,
  fixedEntry,
}: {
  entries: Entry[];
  fixedEntry?: Entry;
}) {
  const { data, navigate } = useApp();
  const [selected, setSelected] = useViewState("tools.session", "");
  const sessions = orderedSessions(entries, localDate(data.profile.timezone));
  const entry =
    fixedEntry ?? sessions.find((e) => e.id === selected) ?? sessions.at(-1);
  const result = entry ? entryTools(entry) : null;
  const prior = entry
    ? sessions
        .slice(
          0,
          sessions.findIndex((e) => e.id === entry.id),
        )
        .reverse()
    : [];
  const previousAbdominal = prior.find(
    (e) =>
      e.tools?.waistProtocol === entry?.tools?.waistProtocol &&
      e.tools?.waistProtocol !== undefined &&
      entryTools(e).abdominal.category !== null,
  );
  const variation = (
    value: number | null | undefined,
    old: Entry | undefined,
  ) => {
    const before = old ? entryTools(old).abdominal.value : null;
    if (value == null || before == null || !old)
      return (
        <p className="small muted">
          Pas encore de séance antérieure comparable.
        </p>
      );
    return (
      <p className="small">
        Variation du rapport : {delta(value - before, 3)} depuis le{" "}
        {sessionDate(old.date)}.
      </p>
    );
  };
  return (
    <section
      className="analysis-indicators tools-section"
      aria-labelledby="analysis-indicators-title"
    >
      <div className="section-heading">
        <h2 id="analysis-indicators-title">Analyse approfondie</h2>
      </div>
      {!fixedEntry && (
        <label className="field-label">
          Séance analysée
          <select
            value={entry?.id ?? ""}
            disabled={!sessions.length}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!sessions.length && (
              <option value="">Aucune séance sur cette période</option>
            )}
            {[...sessions].reverse().map((e) => (
              <option key={e.id} value={e.id}>
                {sessionDate(e.date)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="tools-grid">
        <Card
          id="bmi"
          title="IMC"
          value={
            result?.bmi != null
              ? thresholdNumber(
                  result.bmi,
                  [...BMI_THRESHOLDS, ABDOMINAL_BMI_LIMIT],
                  1,
                )
              : null
          }
          unit="kg/m²"
          explanation="Situe votre poids par rapport à votre hauteur corporelle, sans distinguer muscle et graisse."
          reason={
            result?.bmiReason ??
            (!result || result.bmi === null
              ? "Ajoutez un poids et une hauteur dans cette séance."
              : null)
          }
        >
          {result?.bmi != null && !result.bmiReason && (
            <BmiZone value={result.bmi} />
          )}
          <details className="tool-details">
            <summary>Comprendre le calcul</summary>
            <p>
              IMC = poids (kg) / hauteur corporelle (m)². La hauteur enregistrée
              en cm est divisée par 100 avant le calcul.
            </p>
          </details>
        </Card>
        <Card
          id="abdominal"
          title="Tour de taille / hauteur"
          value={
            result?.abdominal.value != null
              ? thresholdNumber(result.abdominal.value, ABDOMINAL_THRESHOLDS)
              : null
          }
          unit="(sans unité)"
          reason={result?.abdominal.reason}
          variation={variation(
            result?.abdominal.category ? result.abdominal.value : null,
            previousAbdominal,
          )}
        >
          {result?.abdominal.category && (
            <p className={`tool-class tool-class-${result.abdominal.category}`}>
              {ABDOMINAL_LABELS[result.abdominal.category]}
            </p>
          )}
          <p className="small">
            IMC associé à cette séance :{" "}
            {result?.bmi != null
              ? `${thresholdNumber(result.bmi, [ABDOMINAL_BMI_LIMIT], 1)} kg/m²`
              : "non renseigné"}
            .
          </p>
          <details className="tool-details">
            <summary>Comprendre le calcul</summary>
            <p>
              RTH = tour de taille / hauteur corporelle, tous deux en cm (ou
              tous deux en m). Classification sur la valeur non arrondie : sous
              0,40, hors plage retenue ; de 0,40 à moins de 0,50, plage de
              référence ; de 0,50 à moins de 0,60, augmentée ; à partir de 0,60,
              élevée.
            </p>
          </details>
        </Card>
        <Card
          id="waist-hips"
          title="Tour de taille / tour de hanches"
          value={result?.waistHips != null ? number(result.waistHips, 2) : null}
          unit="(sans unité)"
          explanation="Compare votre tour de taille à vos hanches pour décrire vos proportions. Aucun seuil universel n’est appliqué."
          reason={
            result?.waistHips == null
              ? "Ajoutez un tour de taille et un tour de hanches à cette séance."
              : null
          }
        >
          <details className="tool-details">
            <summary>Comprendre le calcul</summary>
            <p>
              Rapport = tour de taille (cm) / tour de hanches (cm), mesurés dans
              la même séance. Hanches : ruban horizontal autour de la partie la
              plus saillante des fesses.
            </p>
          </details>
        </Card>
        <Card
          id="energy"
          title="Dépense énergétique au repos estimée"
          value={
            result?.energy.value != null ? number(result.energy.value, 0) : null
          }
          unit="kcal/jour"
          explanation="Énergie estimée pour faire fonctionner le corps au repos, notamment la respiration et la circulation. Ce n’est ni une dépense totale quotidienne ni un objectif alimentaire."
          reason={result?.energy.reason}
        >
          <details className="tool-details">
            <summary>Comprendre le calcul</summary>
            <p>
              Mifflin–St Jeor, forme simplifiée publiée : 10 × poids (kg) + 6,25
              × hauteur (cm) − 5 × âge (années) + 5 pour l’équation masculine,
              ou − 161 pour l’équation féminine. Aucun coefficient d’activité ni
              déficit calorique n’est ajouté.
            </p>
          </details>
        </Card>
      </div>
      {!fixedEntry && (
        <button className="text-button" onClick={() => navigate("measure")}>
          Prendre une nouvelle mesure guidée
        </button>
      )}
    </section>
  );
}
