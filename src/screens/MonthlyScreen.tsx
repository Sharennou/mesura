import { useState } from "react";
import { Camera, ChevronRight, History } from "lucide-react";
import { useApp } from "../context";
import {
  Badge,
  Button,
  DateLabel,
  Icon,
  PageTitle,
  Progress,
} from "../components";
import {
  delta,
  goalProgress,
  indicatorObservations,
  latest,
  localDate,
  number,
  periodStats,
} from "../../shared/calculations";

export function MonthlyScreen() {
  const { data, navigate, setHistoryMonth } = useApp();
  const today = localDate(data.profile.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
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
      <PageTitle title="Un mois avec vous." eyebrow="Votre bilan du mois" />
      <label className="field-label month-picker">
        Mois du bilan
        <input
          type="month"
          max={today.slice(0, 7)}
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </label>
      <section className="monthly-hero">
        <div className="card-top">
          <span className="eyebrow">Vos rendez-vous</span>
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
                <small>{s.first && <DateLabel date={s.first.date} />}</small>
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
      {entries.length > 0 && (
        <section className="plain-card">
          <h2>Les indicateurs du mois</h2>
          {(
            [
              ["IMC", one.bmi, two.bmi, 1],
              ["Taille / stature", one.waistHeight, two.waistHeight, 2],
              ["Taille / hanches", one.waistHips, two.waistHips, 2],
            ] as const
          ).map(([label, a, b, dec]) => (
            <div className="recap-row" key={label}>
              <span>{label}</span>
              <strong>
                {a === null ? "—" : number(a, dec)} →{" "}
                {b === null ? "—" : number(b, dec)}
              </strong>
            </div>
          ))}
          <p className="small muted">
            Première et dernière valeur calculable du mois, avec leur stature
            historique.
          </p>
          {goal && progress !== null && (
            <>
              <p>
                Objectif : {Math.round(progress)} % selon la dernière mesure du
                mois.
              </p>
              <Progress value={progress} />
            </>
          )}
        </section>
      )}
      <div className="section-heading">
        <h2>Vos notes du mois</h2>
      </div>
      {sorted.filter((e) => e.note.trim()).length ? (
        sorted
          .filter((e) => e.note.trim())
          .map((e) => (
            <article className="plain-card" key={e.id}>
              <span className="eyebrow">
                <DateLabel date={e.date} />
              </span>
              <p className="saved-note">{e.note}</p>
            </article>
          ))
      ) : (
        <p className="small muted">Aucune note pour ce mois.</p>
      )}
      {entries.some((e) => e.photos.length) && (
        <Button onClick={() => navigate("photos")}>
          Voir les photos comparables
          <Icon as={Camera} />
        </Button>
      )}
      <Button
        onClick={() => {
          navigate("history");
          setHistoryMonth(month);
        }}
      >
        Ouvrir mes entrées du mois
        <Icon as={History} />
      </Button>
    </>
  );
}
