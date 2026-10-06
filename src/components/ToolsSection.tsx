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
  EQUATION_LABELS,
  PROTOCOL_LABELS,
  SITUATION_LABELS,
  TOOL_VERSION,
  ageAt,
  entryTools,
  orderedSessions,
  thresholdNumber,
} from "../../shared/body-tools";
import {
  SOURCE_ACCESSED,
  TOOL_SOURCES,
  type ToolSourceId,
} from "../../shared/tool-sources";
import { BmiZone } from "./BmiZone";
import { ProtocolGuide } from "./ToolFields";

function Sources({
  ids,
  children,
}: {
  ids: ToolSourceId[];
  children: ReactNode;
}) {
  return (
    <details className="tool-details">
      <summary>Sources et limites</summary>
      {children}
      <ul className="tool-sources">
        {ids.map((id) => {
          const s = TOOL_SOURCES[id];
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title} (nouvel onglet)
              </a>
              <br />
              {s.authors} · {s.year}. {s.doi && <>DOI : {s.doi}. </>}
              {s.role}. Consulté le {SOURCE_ACCESSED}.
            </li>
          );
        })}
      </ul>
    </details>
  );
}
function Trace({
  entry,
  keys,
  usesHeight = true,
  predictive = false,
}: {
  entry?: Entry;
  keys: string[];
  usesHeight?: boolean;
  predictive?: boolean;
}) {
  const { data } = useApp();
  if (!entry) return <p className="small muted">Aucune séance disponible.</p>;
  const context = entry.tools;
  return (
    <details className="tool-details">
      <summary>Données utilisées · {entry.date}</summary>
      <dl className="tool-trace">
        {keys.map((id) => (
          <div key={id}>
            <dt>
              {data.measures.find((m) => m.id === id)?.name ?? id} ·{" "}
              {entry.date}
            </dt>
            <dd>
              {entry.values[id] === undefined
                ? "Non renseigné"
                : `${String(entry.values[id]).replace(".", ",")} ${data.measures.find((m) => m.id === id)?.unit ?? ""}`}
            </dd>
          </div>
        ))}
        {usesHeight && (
          <div>
            <dt>
              Hauteur corporelle ·{" "}
              {context?.heightDate ?? "date initiale inconnue"}
            </dt>
            <dd>
              {entry.height === null
                ? "Non renseignée"
                : `${String(entry.height).replace(".", ",")} cm`}{" "}
              ·{" "}
              {context?.heightOrigin === "profile"
                ? "reprise du profil"
                : context?.heightOrigin === "session"
                  ? "renseignée dans la séance"
                  : "valeur historique conservée"}
            </dd>
          </div>
        )}
        {keys.includes("waist") && (
          <div>
            <dt>Protocole du tour de taille</dt>
            <dd>{PROTOCOL_LABELS[context?.waistProtocol ?? "unknown"]}</dd>
          </div>
        )}
        {keys.includes("waist-rfm") && (
          <div>
            <dt>Protocole RFM</dt>
            <dd>{PROTOCOL_LABELS[context?.rfmWaistProtocol ?? "unknown"]}</dd>
          </div>
        )}
        <div>
          <dt>Âge à la séance</dt>
          <dd>
            {ageAt(context?.birthDate, entry.date) ?? "Non renseigné"}
            {context?.birthDate ? ` ans · naissance ${context.birthDate}` : ""}
          </dd>
        </div>
        <div>
          <dt>Situation déclarée à la séance</dt>
          <dd>{SITUATION_LABELS[context?.situation ?? "unknown"]}</dd>
        </div>
        {predictive && (
          <div>
            <dt>Équation choisie</dt>
            <dd>{EQUATION_LABELS[context?.equation ?? "unspecified"]}</dd>
          </div>
        )}
        <div>
          <dt>Version des règles</dt>
          <dd>
            {context?.version ?? "Ratios historiques ; contexte inconnu"} ·
            calcul actuel {TOOL_VERSION}
          </dd>
        </div>
      </dl>
      <p className="small">
        Poids et tours proviennent exclusivement de cette séance. Les valeurs
        ci-dessus conservent toute leur précision.
      </p>
    </details>
  );
}
function Card({
  id,
  title,
  value,
  unit = "",
  explanation,
  reason,
  entry,
  keys,
  usesHeight,
  predictive,
  children,
  variation,
}: {
  id: string;
  title: string;
  value: string | null;
  unit?: string;
  explanation: string;
  reason?: string | null;
  entry?: Entry;
  keys: string[];
  usesHeight?: boolean;
  predictive?: boolean;
  children: ReactNode;
  variation?: ReactNode;
}) {
  const { edit, navigate } = useApp();
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
      <p className="small indicator-explanation">{explanation}</p>
      {reason && <p className="tool-state">{reason}</p>}
      {variation}
      <Trace
        entry={entry}
        keys={keys}
        usesHeight={usesHeight}
        predictive={predictive}
      />
      <button
        className="text-button"
        onClick={() => (entry ? edit(entry) : navigate("measure"))}
      >
        {entry ? "Compléter ou corriger cette séance" : "Ajouter une mesure"}
      </button>
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
  const previousRfm = prior.find(
    (e) =>
      e.tools?.equation === entry?.tools?.equation &&
      e.tools?.version === entry?.tools?.version &&
      entryTools(e).rfm.value !== null,
  );
  const variation = (
    value: number | null | undefined,
    old: Entry | undefined,
    key: "abdominal" | "rfm",
  ) => {
    const before = old ? entryTools(old)[key].value : null;
    if (value == null || before == null || !old)
      return (
        <p className="small muted">
          Pas encore de séance antérieure comparable.
        </p>
      );
    return (
      <p className="small">
        {key === "rfm" ? "Variation de l’estimation" : "Variation du rapport"} :{" "}
        {delta(value - before, key === "rfm" ? 1 : 3)}{" "}
        {key === "rfm" ? "point(s) de pourcentage" : ""} depuis le {old.date}{" "}
        (séance {old.id.slice(0, 8)}).
      </p>
    );
  };
  return (
    <section
      className="analysis-indicators tools-section"
      aria-labelledby="analysis-indicators-title"
    >
      <div className="section-heading">
        <h2 id="analysis-indicators-title">Outils</h2>
      </div>
      {!fixedEntry && (
        <label className="field-label">
          Séance utilisée pour les outils
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
                {e.date} · {e.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="small muted">
        Indicateurs de suivi et d’évaluation initiale : l’IMC et les
        mensurations ne suffisent pas à établir un diagnostic complet.{" "}
        <a href={TOOL_SOURCES.has.url} target="_blank" rel="noreferrer">
          Guide HAS (nouvel onglet)
        </a>
        .
      </p>
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
          entry={entry}
          keys={["weight"]}
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
          <Sources ids={["nice", "has"]}>
            <p>
              Les repères affichés concernent les adultes. Leur interprétation
              dépend notamment de la musculature, de l’âge, des origines et de
              la situation clinique. Une valeur dans une plage de référence ne
              signifie pas une absence de risque.
            </p>
          </Sources>
        </Card>
        <Card
          id="abdominal"
          title="Adiposité abdominale — tour de taille / hauteur"
          value={
            result?.abdominal.value != null
              ? thresholdNumber(result.abdominal.value, ABDOMINAL_THRESHOLDS)
              : null
          }
          unit="(sans unité)"
          explanation="Le rapport tour de taille/hauteur (RTH) décrit l’adiposité abdominale en complément de l’IMC."
          reason={result?.abdominal.reason}
          entry={entry}
          keys={["waist", "weight"]}
          variation={variation(
            result?.abdominal.category ? result.abdominal.value : null,
            previousAbdominal,
            "abdominal",
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
            <ProtocolGuide />
          </details>
          <Sources ids={["nice", "has"]}>
            <p>
              NICE recommande ce repère chez les adultes avec IMC &lt; 35 kg/m²,
              pour les deux sexes et toutes les origines. Une adiposité
              augmentée ou élevée invite à discuter d’une évaluation des risques
              cardiométaboliques avec un professionnel. La plage de référence ne
              garantit pas l’absence de risque pour la santé.
            </p>
          </Sources>
        </Card>
        <Card
          id="waist-hips"
          title="Tour de taille / tour de hanches"
          value={result?.waistHips != null ? number(result.waistHips, 2) : null}
          unit="(sans unité)"
          explanation="Compare votre tour de taille à vos hanches pour décrire vos proportions. Aucun seuil universel n’est appliqué."
          entry={entry}
          keys={["waist", "hips"]}
          usesHeight={false}
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
              plus saillante des fesses. Le protocole du tour de taille est
              indiqué dans les données utilisées.
            </p>
          </details>
          <Sources ids={["who"]}>
            <p>
              L’OMS examine les différences selon le sexe, l’âge, les
              populations et les méthodes de mesure. Mesura conserve ce ratio
              descriptif, y compris pour les anciennes mesures de protocole
              inconnu, sans lui attribuer de catégorie de santé.
            </p>
          </Sources>
        </Card>
        <Card
          id="rfm"
          title="Masse grasse estimée — RFM"
          value={result?.rfm.value != null ? number(result.rfm.value) : null}
          unit="%"
          explanation="Estimation de la proportion de masse grasse à partir de la hauteur et d’un tour de taille spécifique."
          reason={result?.rfm.reason}
          entry={entry}
          keys={["waist-rfm"]}
          predictive
          variation={variation(result?.rfm.value, previousRfm, "rfm")}
        >
          <details className="tool-details">
            <summary>Comprendre le calcul</summary>
            <p>
              Équation masculine : 64 − 20 × (hauteur / tour de taille).
              Équation féminine : 76 − 20 × (hauteur / tour de taille). Les deux
              longueurs sont en cm ou dans la même unité. Le résultat est déjà
              en %, sans multiplication par 100.
            </p>
            <ProtocolGuide rfm />
          </details>
          <Sources ids={["rfm", "mexico"]}>
            <p>
              Woolcott et Bergman : validation contre la DXA chez 3 456 adultes
              américains de 20 à 69 ans. La validation externe au nord-ouest du
              Mexique porte sur 61 adultes de 20 à 37 ans ; elle utilise le
              nombril comme repère, différent du protocole original retenu ici.
              Les résultats dépendent aussi de la méthode de référence. Ces
              études ne garantissent pas la précision individuelle. Une
              variation de l’estimation ne prouve ni des kilos de graisse perdus
              ni un gain musculaire.
            </p>
            <p>
              Choix Mesura : calcul automatique à 20–69 ans inclus, sans
              catégorie de normalité, marge d’erreur ni intervalle de confiance.
              Ces âges reflètent la validation retenue, pas des frontières
              biologiques. Toute extension nécessite une validation applicable.
            </p>
          </Sources>
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
          entry={entry}
          keys={["weight"]}
          predictive
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
          <Sources ids={["mifflin", "frankenfield"]}>
            <p>
              L’étude originale porte sur 498 adultes de 19 à 78 ans, comparés à
              la calorimétrie indirecte. La revue de 2005 relève aussi des
              erreurs individuelles et des groupes moins représentés. La
              précision à ±10 % observée chez une partie des participants n’est
              ni une garantie ni un intervalle de confiance individuel.
            </p>
            <p>
              Choix Mesura : calcul automatique à 19–78 ans inclus, sur l’âge à
              la séance. Ce périmètre reflète l’étude retenue, pas une frontière
              biologique ; une extension exige une validation supplémentaire.
            </p>
          </Sources>
        </Card>
      </div>
      <p className="small muted">
        Choix Mesura : estimations et classifications suspendues pendant la
        grossesse, l’allaitement ou une condition modifiant fortement la
        composition corporelle, et lorsque la situation n’est pas renseignée.
        Les valeurs brutes restent consultables. Les calculs sont effectués dans
        votre navigateur.
      </p>
      {!fixedEntry && (
        <button className="text-button" onClick={() => navigate("measure")}>
          Prendre une nouvelle mesure guidée
        </button>
      )}
    </section>
  );
}
