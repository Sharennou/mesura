import { useViewState } from "../useViewState";
import { ChevronRight, History } from "lucide-react";
import { useApp } from "../context";
import {
  Badge,
  Button,
  DateLabel,
  Icon,
  Empty,
  PageTitle,
  Progress,
} from "../components";
import {
  goalProgress,
  indicatorObservations,
  latest,
  localDate,
  number,
  periodStats,
} from "../../shared/calculations";

export function MonthlyScreen() {
  const { data, navigate, setHistoryMonth, setViewState } = useApp();
  const today = localDate(data.profile.timezone);
  const [month, setMonth] = useViewState("monthly.month", today.slice(0, 7));
  const entries = data.entries.filter((e) => e.date.startsWith(month));
  const sorted = [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
  const observed = {
    bmi: indicatorObservations(entries, "bmi"),
    waistHeight: indicatorObservations(entries, "waistHeight"),
    waistHips: indicatorObservations(entries, "waistHips"),
  };
  const one = {
    bmi: observed.bmi[0]?.value ?? null,
    waistHeight: observed.waistHeight[0]?.value ?? null,
    waistHips: observed.waistHips[0]?.value ?? null,
  };
  const two = {
    bmi: observed.bmi.at(-1)?.value ?? null,
    waistHeight: observed.waistHeight.at(-1)?.value ?? null,
    waistHips: observed.waistHips.at(-1)?.value ?? null,
  };
  const days = new Set(entries.map((e) => e.date)).size;
  const goal = data.goal;
  const current = goal
    ? latest(
        entries.filter((e) => e.date >= goal.startDate),
        goal.measureId,
      )
    : null;
  const progress =
    goal && current ? goalProgress(goal, current.values[goal.measureId]) : null;
  const measures = data.measures.filter((m) =>
    entries.some((e) => e.values[m.id] !== undefined),
  );
  return (
    <>
      <PageTitle title="Bilan mensuel" />
      <label className="field-label month-picker">
        Mois du bilan
        <input
          id="monthly-month"
          type="month"
          max={today.slice(0, 7)}
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </label>
      {!entries.length ? (
        <>
          <Empty title="Aucune entrée ce mois-ci">
            Choisissez un autre mois ou ajoutez une mesure à la date souhaitée.
          </Empty>
          <Button onClick={() => navigate("measure")}>
            Ajouter une mesure
          </Button>
          <Button
            onClick={() => document.getElementById("monthly-month")?.focus()}
          >
            Choisir un autre mois
          </Button>
          <div className="measure-chips">
            {[...new Set(data.entries.map((e) => e.date.slice(0, 7)))]
              .sort()
              .reverse()
              .slice(0, 6)
              .map((m) => (
                <button key={m} onClick={() => setMonth(m)}>
                  {new Intl.DateTimeFormat("fr-FR", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(`${m}-01T12:00:00`))}
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <section className="monthly-hero">
            <div className="card-top">
              <span className="eyebrow">Régularité du mois</span>
              {month === today.slice(0, 7) && (
                <span className="status-label">En cours</span>
              )}
            </div>
            <strong>{entries.length}</strong>
            <p>
              entrée{entries.length > 1 ? "s" : ""} · {days} jour
              {days > 1 ? "s" : ""} renseigné{days > 1 ? "s" : ""}
            </p>
            <div className="monthly-rule" />
            <p>
              {entries.length
                ? `Vous avez pris le temps de poser ${entries.length} repère${entries.length > 1 ? "s" : ""} ce mois-ci.`
                : "Votre prochain repère peut commencer aujourd’hui."}
            </p>
          </section>
          {measures.map((m) => {
            const s = periodStats(entries, m.id, `${month}-01`, `${month}-31`);
            return (
              <section className="monthly-measure" key={m.id}>
                <div className="card-top">
                  <h2>{m.name}</h2>
                  <Badge value={s.delta} unit={m.unit} />
                </div>
                <div className="monthly-values">
                  <span>
                    Première
                    <strong>
                      {s.first ? number(s.first.value) : "—"} {m.unit}
                    </strong>
                    <small>
                      {s.first && <DateLabel date={s.first.date} />}
                    </small>
                  </span>
                  <Icon as={ChevronRight} />
                  <span>
                    Dernière
                    <strong>
                      {s.last ? number(s.last.value) : "—"} {m.unit}
                    </strong>
                    <small>{s.last && <DateLabel date={s.last.date} />}</small>
                  </span>
                </div>
                <p className="small">
                  Moyenne journalière du mois :{" "}
                  <strong>
                    {s.average === null ? "—" : number(s.average)} {m.unit}
                  </strong>{" "}
                  · {s.days} jours
                </p>
              </section>
            );
          })}
          {Object.values(observed).some((values) => values.length > 0) && (
            <section className="plain-card">
              <h2>Les indicateurs du mois</h2>
              {(
                [
                  ["IMC", one.bmi, two.bmi, 1],
                  [
                    "Tour de taille / hauteur",
                    one.waistHeight,
                    two.waistHeight,
                    2,
                  ],
                  [
                    "Tour de taille / tour de hanches",
                    one.waistHips,
                    two.waistHips,
                    2,
                  ],
                ] as const
              )
                .filter(([, a, b]) => a !== null || b !== null)
                .map(([label, a, b, dec]) => (
                  <div className="recap-row" key={label}>
                    <span>{label}</span>
                    <strong>
                      {a === null ? "—" : number(a, dec)} →{" "}
                      {b === null ? "—" : number(b, dec)}
                    </strong>
                  </div>
                ))}
              <p className="small muted">
                Première et dernière valeur calculable du mois, avec leur
                hauteur historique.
              </p>
              {goal && progress !== null && (
                <>
                  <p>
                    Objectif : {Math.round(progress)} % selon la dernière mesure
                    du mois.
                  </p>
                  <Progress value={progress} />
                </>
              )}
            </section>
          )}
          {sorted.some((e) => e.note.trim()) && (
            <>
              <div className="section-heading">
                <h2>Notes du mois</h2>
              </div>
              {sorted
                .filter((e) => e.note.trim())
                .map((e) => (
                  <article className="plain-card" key={e.id}>
                    <span className="eyebrow">
                      <DateLabel date={e.date} />
                    </span>
                    <p className="saved-note">{e.note}</p>
                  </article>
                ))}
            </>
          )}
          <Button
            onClick={() => {
              setViewState((state) => ({ ...state, "history.date": "" }));
              navigate("history");
              setHistoryMonth(month);
            }}
          >
            Historique des mesures · ce mois
            <Icon as={History} />
          </Button>
        </>
      )}
    </>
  );
}
