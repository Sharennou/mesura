import {
  CalendarRange,
  CalendarDays,
  History,
  Target,
  Ruler,
} from "lucide-react";
import { ComparisonChart } from "../components/ComparisonChart";
import { BmiZone } from "../components/BmiZone";
import { useApp } from "../context";
import { useViewState } from "../useViewState";
import {
  Badge,
  Button,
  Chart,
  DateLabel,
  Empty,
  Icon,
  LinkCard,
  PageTitle,
  Progress,
} from "../components";
import {
  dailyValues,
  latest,
  localDate,
  number,
  periodBounds,
  periodStats,
  indicatorObservations,
  goalProgress,
  projection,
} from "../../shared/calculations";

export function AnalysisScreen() {
  const { data, navigate } = useApp();
  const [storedPeriod, setPeriod] = useViewState("analysis.period", "3M");
  const period = ["3M", "6M", "1A", "MAX"].includes(storedPeriod)
    ? storedPeriod
    : "3M";
  const [selected, setSelected] = useViewState<string[]>("analysis.measures", [
    "weight",
  ]);
  const selectedMeasures = selected.flatMap((id) =>
    data.measures.filter((m) => m.id === id),
  );
  const measure = selectedMeasures[0] ?? data.measures[0];
  const multiple = selectedMeasures.length > 1;
  const bounds = periodBounds(
    period,
    data.entries,
    localDate(data.profile.timezone),
  );
  const points = dailyValues(
    data.entries,
    measure.id,
    bounds.start,
    bounds.end,
  );
  const knownPoints = dailyValues(data.entries, measure.id);
  const stat = periodStats(data.entries, measure.id, bounds.start, bounds.end);
  const last = latest(data.entries, measure.id);
  const periodEntries = data.entries.filter(
    (e) => e.date >= bounds.start && e.date <= bounds.end,
  );
  const sources = {
    bmi: indicatorObservations(periodEntries, "bmi").at(-1),
    waistHeight: indicatorObservations(periodEntries, "waistHeight").at(-1),
    waistHips: indicatorObservations(periodEntries, "waistHips").at(-1),
  };
  const goal = data.goal;
  const goalLast = goal
    ? latest(
        periodEntries.filter((e) => e.date >= goal.startDate),
        goal.measureId,
      )
    : null;
  const progress =
    goal && goalLast
      ? goalProgress(goal, goalLast.values[goal.measureId])
      : null;
  const estimated = goal ? projection(periodEntries, goal) : null;
  const tracked = data.measures.filter(
    (m) =>
      m.id === "weight" ||
      data.profile.visible.includes(m.id) ||
      data.entries.some((e) => e.values[m.id] !== undefined),
  );
  const series = selectedMeasures.map((m) => ({
    ...m,
    data: dailyValues(data.entries, m.id, bounds.start, bounds.end),
  }));
  const hasTrend = series.some((s) => s.data.length > 1);
  function toggleMeasure(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  }
  return (
    <>
      <PageTitle title="Analyse" back={false} />
      {!data.entries.length ? (
        <>
          <Empty title="Votre évolution commence ici" icon={Ruler}>
            Enregistrez une première mesure. Vous pourrez ensuite retrouver vos
            valeurs et suivre leur évolution.
          </Empty>
          <Button className="primary" onClick={() => navigate("measure")}>
            Enregistrer ma première mesure
          </Button>
        </>
      ) : (
        <>
          <p className="small muted">
            Choisissez une ou plusieurs mesures à afficher.
          </p>
          <div
            className="measure-chips"
            role="group"
            aria-label="Mesures du graphique"
          >
            {tracked.map((m) => (
              <button
                key={m.id}
                aria-pressed={selected.includes(m.id)}
                onClick={() => toggleMeasure(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          {data.entries.length > 1 && (
            <>
              <div className="period-selector" aria-label="Période d’analyse">
                {["3M", "6M", "1A", "MAX"].map((p) => (
                  <button
                    key={p}
                    aria-pressed={period === p}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="period-dates">
                <DateLabel date={bounds.start} /> —{" "}
                <DateLabel date={bounds.end} /> {bounds.end.slice(0, 4)}
              </p>
            </>
          )}
          <section
            className={`graph-card ${(multiple ? !hasTrend : points.length < 2) ? "graph-compact" : ""}`}
          >
            {multiple ? (
              <>
                <div className="card-top">
                  <span className="eyebrow">Évolution des mesures</span>
                </div>
                <div className="comparison-readings">
                  {selectedMeasures.map((m) => {
                    const lastValue = latest(data.entries, m.id);
                    return (
                      <div key={m.id}>
                        <span>{m.name}</span>
                        <strong>
                          {lastValue
                            ? `${number(lastValue.values[m.id])} ${m.unit}`
                            : "Non renseigné"}
                        </strong>
                        {lastValue && (
                          <small>
                            Dernière connue ·{" "}
                            <DateLabel date={lastValue.date} />
                            {(lastValue.date < bounds.start ||
                              lastValue.date > bounds.end) &&
                              " · hors période"}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasTrend ? (
                  <ComparisonChart
                    key={`${selected.join("-")}-${period}`}
                    series={series}
                  />
                ) : (
                  <p className="analysis-hint">
                    Ajoutez des mesures à plusieurs dates ou choisissez une
                    période plus longue pour comparer leur évolution.
                  </p>
                )}
                {!hasTrend && series.every((s) => !s.data.length) && (
                  <button
                    className="text-button"
                    onClick={() => setPeriod("MAX")}
                  >
                    Voir toute la période
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="card-top">
                  <span className="eyebrow">{measure.name}</span>
                  {points.length > 1 && (
                    <Badge value={stat.delta} unit={measure.unit} />
                  )}
                </div>
                {last ? (
                  <>
                    <div className="graph-value">
                      <strong
                        style={
                          number(last.values[measure.id]).length > 5
                            ? { fontSize: 60 }
                            : undefined
                        }
                      >
                        {number(last.values[measure.id])}
                      </strong>
                      <span>{measure.unit}</span>
                    </div>
                    <p className="graph-caption">
                      Dernière valeur connue · <DateLabel date={last.date} />{" "}
                      {last.date.slice(0, 4)}
                      {(last.date < bounds.start || last.date > bounds.end) &&
                        " · hors période"}
                    </p>
                  </>
                ) : (
                  <p className="graph-caption">
                    Aucune valeur de {measure.name.toLocaleLowerCase("fr")}{" "}
                    enregistrée.
                  </p>
                )}
                {points.length > 1 ? (
                  <>
                    <Chart
                      key={`${measure.id}-${period}`}
                      data={points}
                      unit={measure.unit}
                    />
                    <div className="graph-footer">
                      <span>Variation sur la période</span>
                      <strong>{stat.days} jours renseignés</strong>
                    </div>
                    <p className="small">
                      De {number(stat.first!.value)} à{" "}
                      {number(stat.last!.value)} {measure.unit}. Les points
                      représentent les moyennes de chaque jour renseigné.
                    </p>
                  </>
                ) : (
                  <p className="analysis-hint">
                    {!last
                      ? "Choisissez une autre mesure ou ajoutez cette valeur dans une entrée."
                      : !points.length
                        ? "Aucune valeur sur la période choisie. Votre dernière valeur connue reste affichée ci-dessus."
                        : knownPoints.length === 1
                          ? "Votre première valeur est enregistrée. Une prochaine mesure, à une autre date, permettra de suivre son évolution."
                          : "Un seul jour renseigné sur cette période. Choisissez une période plus longue pour comparer."}
                  </p>
                )}
                {!points.length && last && (
                  <button
                    className="text-button"
                    onClick={() => setPeriod("MAX")}
                  >
                    Voir toute la période
                  </button>
                )}
                {!last && (
                  <button
                    className="text-button"
                    onClick={() => navigate("measure")}
                  >
                    Ajouter une mesure
                  </button>
                )}
              </>
            )}
          </section>
          <section
            className="analysis-indicators"
            aria-labelledby="analysis-indicators-title"
          >
            <div className="section-heading">
              <h2 id="analysis-indicators-title">IMC et ratios</h2>
            </div>
            <div className="indicator-card">
              {(
                [
                  [
                    "IMC",
                    sources.bmi,
                    "Ajoutez un poids et une hauteur dans la même entrée.",
                    1,
                    "Situe votre poids par rapport à votre hauteur, sans distinguer muscle et graisse.",
                  ],
                  [
                    "Tour de taille / hauteur",
                    sources.waistHeight,
                    "Ajoutez un tour de taille et une hauteur dans la même entrée.",
                    2,
                    "Compare votre tour de taille à votre hauteur corporelle.",
                  ],
                  [
                    "Tour de taille / tour de hanches",
                    sources.waistHips,
                    "Ajoutez un tour de taille et un tour de hanches dans la même entrée.",
                    2,
                    "Compare votre tour de taille à vos hanches pour décrire vos proportions.",
                  ],
                ] as const
              ).map(([label, source, missing, decimals, explanation]) => (
                <div className="indicator-detail" key={label}>
                  <span>{label}</span>
                  {source ? (
                    <>
                      <strong>
                        {number(source.value, decimals)}
                        {label === "IMC" ? " kg/m²" : ""}
                      </strong>
                      {label === "IMC" && <BmiZone value={source.value} />}
                      <small>
                        <DateLabel date={source.date} />
                      </small>
                    </>
                  ) : (
                    <p className="small muted">
                      {missing} Aucune valeur calculable sur cette période.
                    </p>
                  )}
                  <p className="small muted indicator-explanation">
                    {explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <div className="section-heading">
        <h2>Comprendre et comparer</h2>
      </div>
      <div className="stack analysis-tools">
        <LinkCard
          icon={CalendarRange}
          title="Comparer deux périodes"
          description="Comparer les moyennes de vos mesures."
          onClick={() => navigate("compare")}
        />
        <LinkCard
          icon={CalendarDays}
          title="Bilan mensuel"
          description="Régularité et évolutions du mois."
          onClick={() => navigate("monthly")}
        />
      </div>
      {data.entries.length > 0 && (
        <>
          <details className="optional-panel">
            <summary>
              Vos objectifs <span className="optional">Facultatifs</span>
            </summary>
            {goal ? (
              <section className="goal-card">
                <span className="eyebrow">
                  {data.measures.find((m) => m.id === goal.measureId)?.name} ·
                  objectif
                </span>
                <div className="goal-target">
                  <strong>{number(goal.target)}</strong>
                  <span>
                    {data.measures.find((m) => m.id === goal.measureId)?.unit}
                  </span>
                </div>
                {progress !== null ? (
                  <>
                    <p className="small">
                      {Math.round(progress)} % du chemin depuis{" "}
                      {number(goal.start)}.
                    </p>
                    <Progress value={progress} />
                  </>
                ) : (
                  <p className="small">
                    {goal.target === goal.start
                      ? "Un objectif de maintien, à votre rythme."
                      : "Aucune valeur disponible sur la période depuis le départ de votre objectif."}
                  </p>
                )}
                <button
                  className="text-button"
                  onClick={() => navigate("goal")}
                >
                  Modifier mon objectif
                </button>
              </section>
            ) : (
              <LinkCard
                icon={Target}
                title="Choisir mon objectif"
                description="Un cap facultatif, librement choisi."
                onClick={() => navigate("goal")}
              />
            )}
            {estimated && (
              <section className="projection-card">
                <span className="eyebrow">Projection indicative</span>
                <h2>
                  <DateLabel date={estimated.date} />
                </h2>
                <p>
                  Estimation si la tendance observée se poursuit. Elle peut
                  changer avec les prochaines mesures et ne garantit pas une
                  date.
                </p>
                <details>
                  <summary>Comment estimer la tendance ?</summary>
                  <p>
                    Régression sur les 90 derniers jours depuis le départ : au
                    moins 4 jours distincts sur 3 semaines, R² ≥ 0,6, pente vers
                    la cible et horizon d’un an maximum.
                  </p>
                </details>
              </section>
            )}
          </details>
        </>
      )}
      <button
        className="text-button history-access"
        onClick={() => navigate("history")}
      >
        <Icon as={History} size={18} />
        Historique des mesures
      </button>
    </>
  );
}
