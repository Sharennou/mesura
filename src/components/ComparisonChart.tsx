import { useId, useState } from "react";
import { DateLabel } from "../components";
import { number } from "../../shared/calculations";

export interface ChartSeries {
  id: string;
  name: string;
  unit: string;
  data: { date: string; value: number }[];
}
const colors = ["var(--volt)", "var(--cobalt)", "var(--white)"];
const patterns = [undefined, "8 4", "2 4", "8 3 2 3", "12 3 3 3"];

export function ComparisonChart({ series }: { series: ChartSeries[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const helpId = useId();
  const dates = [
    ...new Set(series.flatMap((s) => s.data.map((p) => p.date))),
  ].sort();
  const normalized = series.map((s) => ({
    ...s,
    points: s.data.map((p) => ({
      ...p,
      change: (p.value / s.data[0].value - 1) * 100,
    })),
  }));
  const values = normalized.flatMap((s) => s.points.map((p) => p.change));
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const padding = (high - low || 2) * 0.18;
  const min = low - padding,
    max = high + padding;
  const width = 330,
    height = 210,
    px = 45,
    py = 18;
  const start = Date.parse(dates[0]),
    end = Date.parse(dates.at(-1)!);
  const x = (date: string) =>
    start === end
      ? width / 2
      : px + ((Date.parse(date) - start) / (end - start)) * (width - px - 12);
  const y = (change: number) =>
    py + ((max - change) / (max - min)) * (height - 2 * py);
  const chosen = selected && dates.includes(selected) ? selected : null;
  const dash = (index: number) =>
    patterns[Math.floor(index / colors.length) % patterns.length];
  return (
    <div className="chart comparison-chart">
      <p className="chart-comparison-help" id={helpId}>
        Évolution en % : chaque courbe commence à 0 à sa première mesure de la
        période. Touchez une date pour lire les valeurs en kg, cm ou dans leur
        unité.
      </p>
      <ul className="chart-legend" aria-label="Mesures affichées">
        {series.map((s, i) => (
          <li key={s.id}>
            <svg viewBox="0 0 24 8" aria-hidden="true">
              <line
                x1="0"
                x2="24"
                y1="4"
                y2="4"
                stroke={colors[i % colors.length]}
                strokeWidth="3"
                strokeDasharray={dash(i)}
              />
            </svg>
            <span>
              {s.name}{" "}
              <small>
                ({s.unit})
                {!s.data.length ? " · sans valeur sur la période" : ""}
              </small>
            </span>
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Évolution comparée des mesures en pourcentage"
        aria-describedby={helpId}
        onClick={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          const coordinate = ((e.clientX - bounds.left) / bounds.width) * width;
          setSelected(
            dates.reduce((nearest, date) =>
              Math.abs(x(date) - coordinate) < Math.abs(x(nearest) - coordinate)
                ? date
                : nearest,
            ),
          );
        }}
      >
        {[0, 1, 2].map((i) => {
          const value = max - (i * (max - min)) / 2;
          return (
            <g key={i}>
              <line
                x1={px}
                x2={width}
                y1={y(value)}
                y2={y(value)}
                className="chart-grid"
              />
              <text x="0" y={y(value) + 4} className="axis-label">
                {value > 0 ? "+" : ""}
                {number(value, 1)} %
              </text>
            </g>
          );
        })}
        <line
          x1={px}
          x2={width}
          y1={y(0)}
          y2={y(0)}
          className="chart-baseline"
        />
        {chosen && (
          <line
            x1={x(chosen)}
            x2={x(chosen)}
            y1={py}
            y2={height - py}
            className="chart-selection"
          />
        )}
        {normalized.map((s, i) => (
          <g key={s.id} data-series={s.id}>
            {s.points.length > 1 && (
              <path
                d={s.points
                  .map((p, j) => `${j ? "L" : "M"}${x(p.date)},${y(p.change)}`)
                  .join(" ")}
                className="chart-line"
                style={{ stroke: colors[i % colors.length] }}
                strokeDasharray={dash(i)}
              />
            )}
            {s.points.map((p) => (
              <circle
                key={p.date}
                cx={x(p.date)}
                cy={y(p.change)}
                r={chosen === p.date ? 5 : 3}
                fill={colors[i % colors.length]}
                stroke="var(--ink)"
                strokeWidth="1.5"
                pointerEvents="none"
              />
            ))}
          </g>
        ))}
        {dates.map((date) => (
          <circle
            key={date}
            cx={x(date)}
            cy={y(
              normalized
                .find((s) => s.points.some((p) => p.date === date))!
                .points.find((p) => p.date === date)!.change,
            )}
            r="26"
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${date} : ${series
              .flatMap((s) => {
                const point = s.data.find((p) => p.date === date);
                return point
                  ? [`${s.name} ${number(point.value)} ${s.unit}`]
                  : [];
              })
              .join(", ")}`}
            onClick={() => setSelected(date)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(date);
              }
            }}
          />
        ))}
      </svg>
      <div className="chart-dates">
        <span>
          <DateLabel date={dates[0]} />
        </span>
        <span>
          <DateLabel date={dates.at(-1)!} />
        </span>
      </div>
      <div className="comparison-point-label" aria-live="polite">
        {chosen ? (
          <>
            <strong>
              <DateLabel date={chosen} />
            </strong>
            {series.map((s) => {
              const point = s.data.find((p) => p.date === chosen);
              return (
                <div key={s.id}>
                  <span>{s.name}</span>
                  <strong>
                    {point
                      ? `${number(point.value)} ${s.unit}`
                      : "Non renseigné"}
                  </strong>
                </div>
              );
            })}
          </>
        ) : (
          <p>Touchez un point pour lire les mesures de cette date.</p>
        )}
      </div>
    </div>
  );
}
