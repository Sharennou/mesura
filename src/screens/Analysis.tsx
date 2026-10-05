import { useState } from "react";
import {
  Camera,
  CalendarRange,
  CalendarDays,
  History,
  Target,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { useApp } from "../context";
import {
  Badge,
  Button,
  Chart,
  DateLabel,
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
  const [period, setPeriod] = useState("3M");
  const [selected, setSelected] = useState("weight");
  const measure =
    data.measures.find((m) => m.id === selected) ?? data.measures[0];
  const bounds = periodBounds(
    period,
    data.entries,
    localDate(data.profile.timezone),
  );
  const points = dailyValues(data.entries, selected, bounds.start, bounds.end);
  const stat = periodStats(data.entries, selected, bounds.start, bounds.end);
  const last = latest(data.entries, selected);
  const periodEntries = data.entries.filter(
    (e) => e.date >= bounds.start && e.date <= bounds.end,
  );
  const sources = {
    bmi: indicatorObservations(periodEntries, "bmi").at(-1),
    waistHeight: indicatorObservations(periodEntries, "waistHeight").at(-1),
    waistHips: indicatorObservations(periodEntries, "waistHips").at(-1),
  };
  const derived = {
    bmi: sources.bmi?.value ?? null,
    waistHeight: sources.waistHeight?.value ?? null,
    waistHips: sources.waistHips?.value ?? null,
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
  return (
    <>
      <PageTitle
        title="Analyse"
        eyebrow="Votre évolution · chaque repère compte"
        back={false}
      >
        <button
          className="circle"
          aria-label="Voir l’historique"
          onClick={() => navigate("history")}
        >
          <Icon as={History} />
        </button>
      </PageTitle>
      <div className="period-selector" aria-label="Période d’analyse">
        {["1M", "3M", "6M", "1A", "MAX"].map((p) => (
          <button
            key={p}
            aria-pressed={period === p}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <section className="graph-card">
        <div className="card-top">
          <span className="eyebrow">{measure.name}</span>
          <Badge value={stat.delta} unit={measure.unit} />
        </div>
        <div className="graph-value">
          <strong
            style={
              last && number(last.values[selected]).length > 5
                ? {
                    fontSize: `${Math.max(48, Math.floor(460 / number(last.values[selected]).length))}px`,
                  }
                : undefined
            }
          >
            {last ? number(last.values[selected]) : "—"}
          </strong>
          <span>{measure.unit}</span>
        </div>
        <p className="graph-caption">
          Dernière valeur globale
          {last && (
            <>
              {" "}
              · <DateLabel date={last.date} />
            </>
          )}
        </p>
        <Chart
          key={`${selected}-${period}`}
          data={points}
          unit={measure.unit}
        />
        <div className="graph-footer">
          <span>Variation sur la période</span>
          <strong>
            {stat.days} jour{stat.days > 1 ? "s" : ""} renseigné
            {stat.days > 1 ? "s" : ""}
          </strong>
        </div>
      </section>
      <p className="period-dates">
        <DateLabel date={bounds.start} /> — <DateLabel date={bounds.end} /> ·{" "}
        {new Date(bounds.end).getFullYear()}
      </p>
      <div className="measure-chips" aria-label="Mesure du graphique">
        {tracked.map((m) => (
          <button
            key={m.id}
            aria-pressed={selected === m.id}
            onClick={() => setSelected(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>Les autres repères</h2>
        <span className="optional">Même période</span>
      </div>
      <div className="measurement-grid">
        {tracked
          .filter((m) => m.id !== selected)
          .slice(0, 4)
          .map((m) => {
            const l = latest(data.entries, m.id);
            const s = periodStats(data.entries, m.id, bounds.start, bounds.end);
            return (
              <button
                key={m.id}
                className="measure-tile analysis-tile"
                onClick={() => setSelected(m.id)}
              >
                <div className="card-top">
                  <span className="eyebrow">{m.name}</span>
                  <Icon as={ArrowUpRight} size={14} />
                </div>
                <div className="tile-reading">
                  <strong>{l ? number(l.values[m.id]) : "—"}</strong>
                  <span>{m.unit}</span>
                </div>
                <Badge value={s.delta} unit={m.unit} />
                <Chart
                  mini
                  data={dailyValues(
                    data.entries,
                    m.id,
                    bounds.start,
                    bounds.end,
                  )}
                  unit={m.unit}
                />
                <small>
                  {l ? <DateLabel date={l.date} /> : "Aucune mesure"}
                </small>
              </button>
            );
          })}
      </div>
      <details className="data-details">
        <summary>Consulter les données du graphique</summary>
        {points.length ? (
          <table>
            <caption>{measure.name} · moyenne par jour</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Valeur ({measure.unit})</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td>{number(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Aucune mesure sur cette période.</p>
        )}
      </details>
      <div className="section-heading">
        <h2>Quelques indicateurs</h2>
        <Icon as={Info} size={18} />
      </div>
      <div className="indicator-card">
        <div className="indicator-main">
          <div>
            <span className="eyebrow">IMC</span>
            <strong>{derived.bmi === null ? "—" : number(derived.bmi)}</strong>
            <small>kg/m²</small>
          </div>
          <p>
            {derived.bmi === null ? (
              "Ajoutez un poids et votre stature dans la même entrée."
            ) : (
              <>
                Poids ÷ stature²
                <br />
                <DateLabel date={sources.bmi!.date} />
              </>
            )}
          </p>
        </div>
        <div className="ratio-grid">
          <div>
            <span>Taille / stature</span>
            <strong>
              {derived.waistHeight === null
                ? "—"
                : number(derived.waistHeight, 2)}
            </strong>
            {sources.waistHeight && (
              <small>
                <DateLabel date={sources.waistHeight.date} />
              </small>
            )}
          </div>
          <div>
            <span>Taille / hanches</span>
            <strong>
              {derived.waistHips === null ? "—" : number(derived.waistHips, 2)}
            </strong>
            {sources.waistHips && (
              <small>
                <DateLabel date={sources.waistHips.date} />
              </small>
            )}
          </div>
        </div>
        <details>
          <summary>Comprendre ces calculs</summary>
          <p>
            L’IMC utilise le poids en kg et la stature en mètres. Les ratios
            divisent le tour de taille par la stature ou les hanches, en cm,
            dans la même entrée. La stature historique est conservée. Ces
            repères n’établissent aucun diagnostic.
          </p>
        </details>
      </div>
      {goal ? (
        <>
          <div className="section-heading">
            <h2>Votre cap personnel</h2>
            <button className="text-button" onClick={() => navigate("goal")}>
              Modifier <Icon as={ArrowUpRight} size={14} />
            </button>
          </div>
          <section className="goal-card">
            <div className="card-top">
              <span className="eyebrow">
                {data.measures.find((m) => m.id === goal.measureId)?.name} ·
                objectif
              </span>
              <Icon as={Target} />
            </div>
            <div className="goal-target">
              <strong>{number(goal.target)}</strong>
              <span>
                {data.measures.find((m) => m.id === goal.measureId)?.unit}
              </span>
            </div>
            {progress !== null ? (
              <>
                <div className="goal-label">
                  <span>Départ : {number(goal.start)}</span>
                  <strong>{Math.round(progress)} % du chemin</strong>
                </div>
                <Progress value={progress} />
              </>
            ) : (
              <p>
                {goal.target === goal.start
                  ? "Un objectif de maintien, à votre rythme."
                  : "Ajoutez une mesure pour suivre votre progression."}
              </p>
            )}
          </section>
          <section className="projection-card">
            <span className="eyebrow">Projection</span>
            {estimated ? (
              <>
                <h2>
                  <DateLabel date={estimated.date} />
                </h2>
                <p>Estimation selon votre tendance actuelle.</p>
              </>
            ) : (
              <>
                <h2>À votre rythme.</h2>
                <p>Encore quelques mesures pour estimer votre tendance.</p>
              </>
            )}
            <details>
              <summary>Comment estimer la tendance ?</summary>
              <p>
                Régression linéaire sur les 90 derniers jours renseignés depuis
                le départ. Au moins 4 jours distincts sur 3 semaines, R² ≥ 0,6,
                pente ≥ 0,005 unité/jour vers la cible et horizon de 365 jours
                maximum.
              </p>
            </details>
          </section>
        </>
      ) : (
        <LinkCard
          icon={Target}
          title="Choisir mon objectif"
          description="Votre cap, librement choisi."
          onClick={() => navigate("goal")}
        />
      )}
      <div className="section-heading">
        <h2>Plus loin dans votre suivi</h2>
      </div>
      <div className="stack">
        <LinkCard
          icon={Camera}
          title="Votre évolution en images"
          description="Vos photos, vos angles, vos repères."
          onClick={() => navigate("photos")}
        />
        <LinkCard
          icon={CalendarRange}
          title="Comparer deux périodes"
          description="Deux moments. Un regard d’ensemble."
          onClick={() => navigate("compare")}
        />
        <LinkCard
          icon={CalendarDays}
          title="Votre bilan du mois"
          description="Prenez du recul sur votre régularité."
          onClick={() => navigate("monthly")}
        />
        <Button onClick={() => navigate("history")}>
          Toutes mes entrées <Icon as={History} />
        </Button>
      </div>
    </>
  );
}
