import { DateTime } from "luxon";
import { useApp } from "../context";
import { useViewState } from "../useViewState";
import {
  Badge,
  Button,
  DateLabel,
  ErrorMessage,
  PageTitle,
} from "../components";
import {
  delta,
  localDate,
  number,
  periodStats,
  shiftDate,
} from "../../shared/calculations";

export function CompareScreen() {
  const { data, navigate } = useApp();
  const today = localDate(data.profile.timezone);
  const [a, setA] = useViewState("compare.reference", {
    start: shiftDate(today, -59),
    end: shiftDate(today, -30),
  });
  const [b, setB] = useViewState("compare.compared", {
    start: shiftDate(today, -29),
    end: today,
  });
  const favorites = ["weight", ...data.profile.visible].filter((id) =>
    data.measures.some((m) => m.id === id && !m.archived),
  );
  const [selected, setSelected] = useViewState("compare.measures", favorites);
  const [quick, setQuick] = useViewState("compare.quick", "30");
  const [showAll, setShowAll] = useViewState("compare.all", false);
  const valid = Boolean(
    a.start &&
    a.end &&
    b.start &&
    b.end &&
    a.start <= a.end &&
    b.start <= b.end,
  );
  function choose(value: string) {
    setQuick(value);
    if (value === "month") {
      const month = DateTime.fromISO(today);
      setB({ start: month.startOf("month").toISODate()!, end: today });
      setA({
        start: month.minus({ months: 1 }).startOf("month").toISODate()!,
        end: month.minus({ months: 1 }).endOf("month").toISODate()!,
      });
    } else {
      const days = Number(value);
      setB({ start: shiftDate(today, 1 - days), end: today });
      setA({
        start: shiftDate(today, 1 - 2 * days),
        end: shiftDate(today, -days),
      });
    }
  }
  return (
    <>
      <PageTitle title="Comparer deux périodes" />
      <p className="lead">
        Comparez la moyenne de chaque période. La variation décrit un écart,
        sans jugement sur sa direction.
      </p>
      <div
        className="measure-chips quick-periods"
        aria-label="Comparaisons rapides"
      >
        {[
          ["30", "30 derniers jours"],
          ["7", "7 derniers jours"],
          ["month", "Ce mois / mois précédent"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={quick === value}
            onClick={() => choose(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="compare-range-summary plain-card">
        <p>
          <strong>Période de référence</strong>
          <br />
          {a.start ? <DateLabel date={a.start} /> : "Date à choisir"}{" "}
          {a.start.slice(0, 4)} —{" "}
          {a.end ? <DateLabel date={a.end} /> : "Date à choisir"}{" "}
          {a.end.slice(0, 4)}
        </p>
        <p>
          <strong>Période comparée</strong>
          <br />
          {b.start ? <DateLabel date={b.start} /> : "Date à choisir"}{" "}
          {b.start.slice(0, 4)} —{" "}
          {b.end ? <DateLabel date={b.end} /> : "Date à choisir"}{" "}
          {b.end.slice(0, 4)}
        </p>
      </div>
      <details
        className="optional-panel"
        open={quick === "custom" ? true : undefined}
      >
        <summary>Dates personnalisées</summary>
        {(
          [
            ["Période de référence", a, setA],
            ["Période comparée", b, setB],
          ] as const
        ).map(([label, range, set]) => (
          <section className="compare-period" key={label}>
            <h2>{label}</h2>
            <div className="two-fields">
              <label className="field-label">
                Du
                <input
                  type="date"
                  aria-label={`${label} : du`}
                  value={range.start}
                  onChange={(e) => {
                    setQuick("custom");
                    set((r) => ({ ...r, start: e.target.value }));
                  }}
                />
              </label>
              <label className="field-label">
                Au
                <input
                  type="date"
                  aria-label={`${label} : au`}
                  value={range.end}
                  onChange={(e) => {
                    setQuick("custom");
                    set((r) => ({ ...r, end: e.target.value }));
                  }}
                />
              </label>
            </div>
          </section>
        ))}
      </details>
      <div className="section-heading">
        <h2>Mesures à comparer</h2>
      </div>
      <div className="measure-chips" aria-label="Mesures à comparer">
        {data.measures
          .filter(
            (m) =>
              (showAll || favorites.includes(m.id)) &&
              (!m.archived ||
                data.entries.some((e) => e.values[m.id] !== undefined)),
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
      <button className="text-button" onClick={() => setShowAll(!showAll)}>
        {showAll ? "Afficher mes favorites" : "Choisir d’autres mesures"}
      </button>
      <ErrorMessage>
        {!valid &&
          "Dans chaque période, la date de fin doit suivre la date de début."}
      </ErrorMessage>
      {!selected.length && (
        <p className="plain-card">Choisissez au moins une mesure à comparer.</p>
      )}
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
                {change !== null && <Badge value={change} unit={m.unit} />}
              </div>
              <div className="comparison-values">
                {[
                  ["Référence", sa],
                  ["Comparée", sb],
                ].map(([label, stats]: any) => (
                  <div key={label}>
                    <span className="eyebrow">{label} · moyenne</span>
                    <strong>
                      {stats.average === null ? "—" : number(stats.average)}
                      <small>{m.unit}</small>
                    </strong>
                    <p>{stats.days} jour(s) renseigné(s)</p>
                  </div>
                ))}
              </div>
              {change !== null ? (
                <p className="comparison-change">
                  Moyenne comparée − moyenne de référence :{" "}
                  <strong>
                    {delta(change)} {m.unit}
                  </strong>{" "}
                  · {delta(percent)} %
                </p>
              ) : (
                <div className="comparison-change">
                  <p className="small">
                    Aucune valeur de {m.name.toLocaleLowerCase("fr")} dans{" "}
                    {sa.average === null && sb.average === null
                      ? "les deux périodes"
                      : sa.average === null
                        ? "la période de référence"
                        : "la période comparée"}
                    .
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setQuick("custom")}
                  >
                    Choisir d’autres dates
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("measure")}
                  >
                    Ajouter une mesure
                  </button>
                </div>
              )}
            </section>
          );
        })}
      <details className="optional-panel">
        <summary>Détails du calcul</summary>
        <p className="small">
          Les saisies d’un même jour sont d’abord moyennées. La moyenne de
          période donne le même poids à chaque jour renseigné. Les jours absents
          ne sont pas estimés. Les périodes peuvent avoir des durées différentes
          ; le mois en cours est incomplet.
        </p>
      </details>
    </>
  );
}
