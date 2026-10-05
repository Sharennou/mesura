import { useState } from "react";
import { useApp } from "../context";
import { Badge, Button, ErrorMessage, PageTitle } from "../components";
import {
  delta,
  localDate,
  number,
  periodBounds,
  periodStats,
  shiftDate,
} from "../../shared/calculations";

export function CompareScreen() {
  const { data } = useApp();
  const today = localDate(data.profile.timezone);
  const range = periodBounds("1M", data.entries, today);
  const duration =
    Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) +
    1;
  const [a, setA] = useState({
    start: shiftDate(range.start, -duration),
    end: shiftDate(range.start, -1),
  });
  const [b, setB] = useState(range);
  const [selected, setSelected] = useState(["weight", "waist", "hips"]);
  const valid = Boolean(
    a.start &&
    a.end &&
    b.start &&
    b.end &&
    a.start <= a.end &&
    b.start <= b.end,
  );
  const days = (range: { start: string; end: string }) =>
    range.start && range.end
      ? Math.round(
          (Date.parse(range.end) - Date.parse(range.start)) / 86400000,
        ) + 1
      : "—";
  return (
    <>
      <PageTitle title="Deux périodes. Vos repères." eyebrow="Comparer" />
      <p className="lead">Prenez du recul, sans juger la direction.</p>
      <Button
        onClick={() => {
          setB(range);
          setA({
            start: shiftDate(range.start, -duration),
            end: shiftDate(range.start, -1),
          });
        }}
      >
        Cette période / période précédente
      </Button>
      {(
        [
          ["A", a, setA],
          ["B", b, setB],
        ] as const
      ).map(([label, range, set]) => (
        <section className={`compare-period period-${label}`} key={label}>
          <span className="eyebrow">Période {label}</span>
          <div className="two-fields">
            <label className="field-label">
              Du
              <input
                type="date"
                required
                value={range.start}
                onChange={(e) => set((r) => ({ ...r, start: e.target.value }))}
              />
            </label>
            <label className="field-label">
              Au
              <input
                type="date"
                required
                value={range.end}
                onChange={(e) => set((r) => ({ ...r, end: e.target.value }))}
              />
            </label>
          </div>
          <p className="small">{days(range)} jours calendaires</p>
        </section>
      ))}
      <div className="section-heading">
        <h2>Mesures à comparer</h2>
      </div>
      <div className="measure-chips">
        {data.measures
          .filter(
            (m) =>
              !m.archived ||
              data.entries.some((e) => e.values[m.id] !== undefined),
          )
          .map((m) => (
            <button
              key={m.id}
              aria-pressed={selected.includes(m.id)}
              onClick={() =>
                setSelected((s) =>
                  s.includes(m.id)
                    ? s.filter((id) => id !== m.id)
                    : [...s, m.id],
                )
              }
            >
              {m.name}
            </button>
          ))}
      </div>
      <ErrorMessage>
        {!valid ? "La date de fin doit suivre la date de début." : null}
      </ErrorMessage>
      {valid &&
        selected.map((id) => {
          const m = data.measures.find((m) => m.id === id);
          if (!m) return null;
          const sa = periodStats(data.entries, id, a.start, a.end),
            sb = periodStats(data.entries, id, b.start, b.end);
          const change =
            sa.average !== null && sb.average !== null
              ? sb.average - sa.average
              : null;
          const percent =
            change !== null && sa.average !== null && sa.average !== 0
              ? (change / sa.average) * 100
              : null;
          return (
            <section className="comparison-card" key={id}>
              <div className="card-top">
                <h2>{m.name}</h2>
                <Badge value={change} unit={m.unit} />
              </div>
              <div className="comparison-values">
                {[
                  ["A", sa, a],
                  ["B", sb, b],
                ].map(([label, stats, range]: any) => (
                  <div key={label}>
                    <span className="eyebrow">Période {label} · moyenne</span>
                    <strong>
                      {stats.average === null ? "—" : number(stats.average)}
                      <small>{m.unit}</small>
                    </strong>
                    <p>
                      {range.start} → {range.end}
                    </p>
                    <p>
                      {stats.days} jour{stats.days > 1 ? "s" : ""} renseigné
                      {stats.days > 1 ? "s" : ""}
                    </p>
                    <small>
                      Première :{" "}
                      {stats.first
                        ? `${number(stats.first.value)} · ${stats.first.date}`
                        : "—"}
                      <br />
                      Dernière :{" "}
                      {stats.last
                        ? `${number(stats.last.value)} · ${stats.last.date}`
                        : "—"}
                    </small>
                  </div>
                ))}
              </div>
              <p className="comparison-change">
                Écart B − A :{" "}
                <strong>
                  {delta(change)} {m.unit}
                </strong>{" "}
                · {delta(percent)}
                {percent !== null ? " %" : ""}
              </p>
            </section>
          );
        })}
      <p className="small muted">
        Chaque jour renseigné compte autant : les saisies d’un même jour sont
        d’abord moyennées. Les jours sans saisie ne sont pas estimés. Les durées
        des périodes peuvent différer.
      </p>
    </>
  );
}
