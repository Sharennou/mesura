import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Info,
  Minus,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { delta, number } from "../shared/calculations";
import { useApp } from "./context";
export function Icon({
  as: Component,
  size = 20,
}: {
  as: LucideIcon;
  size?: number;
}) {
  return <Component aria-hidden="true" size={size} strokeWidth={1.9} />;
}
export function PageTitle({
  title,
  eyebrow,
  back = true,
  children,
}: {
  title: string;
  eyebrow?: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const { back: goBack } = useApp();
  return (
    <div className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="heading-row">
        {back && (
          <button className="circle back" aria-label="Revenir" onClick={goBack}>
            <Icon as={ArrowLeft} />
          </button>
        )}
        <h1 tabIndex={-1}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
export function ActionBar({
  children,
  disabled,
  onClick,
  form,
  busy,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  form?: string;
  busy?: boolean;
}) {
  return (
    <div className="action-bar">
      <button
        className="primary"
        disabled={disabled || busy}
        onClick={onClick}
        form={form}
        type={form ? "submit" : "button"}
      >
        {busy ? "Enregistrement…" : children}
        {!busy && <Icon as={ArrowRight} />}
      </button>
    </div>
  );
}
export function Button({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`secondary ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Badge({
  value,
  unit = "",
  inverse = false,
}: {
  value: number | null;
  unit?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={`delta ${value === null || Math.abs(value) < 0.05 ? "neutral" : inverse ? "inverse" : ""}`}
    >
      {value !== null && Math.abs(value) >= 0.05 && (
        <span aria-hidden="true">{value > 0 ? "↗" : "↘"}</span>
      )}{" "}
      {delta(value)}
      {value !== null && unit ? ` ${unit}` : ""}
    </span>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progression vers l’objectif"
    >
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
export function ErrorMessage({ children }: { children?: ReactNode }) {
  return children ? (
    <div className="error-message" role="alert">
      <Icon as={Info} />
      <span>{children}</span>
    </div>
  ) : null;
}
export function Empty({
  title,
  children,
  icon: Component = Plus,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon as={Component} size={28} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch-hit"
      onClick={onChange}
    >
      <span className={`switch ${checked ? "checked" : ""}`}>
        <span />
      </span>
    </button>
  );
}
export function LinkCard({
  icon,
  title,
  description,
  onClick,
  cobalt = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  cobalt?: boolean;
}) {
  return (
    <button className={`link-card ${cobalt ? "cobalt" : ""}`} onClick={onClick}>
      <span className="link-card-icon">
        <Icon as={icon} size={24} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Icon as={ChevronRight} />
    </button>
  );
}
export function DateLabel({
  date,
  full = false,
}: {
  date: string;
  full?: boolean;
}) {
  return (
    <>
      {new Intl.DateTimeFormat(
        "fr-FR",
        full
          ? { weekday: "long", day: "numeric", month: "long" }
          : { day: "numeric", month: "short" },
      ).format(new Date(`${date}T12:00:00`))}
    </>
  );
}
export function Confirm({
  title,
  text,
  onConfirm,
  onClose,
  busy = false,
}: {
  title: string;
  text: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{text}</p>
        <div className="stack">
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Suppression…" : "Confirmer"}
          </Button>
          <Button onClick={onClose} disabled={busy}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
export function Chart({
  data,
  unit,
  mini = false,
}: {
  data: { date: string; value: number }[];
  unit: string;
  mini?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!data.length)
    return (
      <div className={mini ? "mini-empty" : "chart-empty"}>
        {mini
          ? "Pas de données sur la période"
          : "Ajoutez votre première mesure pour commencer votre courbe."}
      </div>
    );
  const width = 330,
    height = mini ? 58 : 176;
  const px = mini ? 4 : 34,
    py = mini ? 5 : 16;
  const values = data.map((d) => d.value);
  const low = Math.min(...values),
    high = Math.max(...values);
  const span = high - low || Math.max(high * 0.02, 1);
  const min = low - span * 0.18,
    max = high + span * 0.18;
  const start = Date.parse(data[0].date);
  const end = Date.parse(data.at(-1)!.date);
  const xs = data.map((d) =>
    end === start
      ? width / 2
      : px + ((Date.parse(d.date) - start) / (end - start)) * (width - px - 8),
  );
  const ys = values.map(
    (v) => py + ((max - v) / (max - min)) * (height - 2 * py),
  );
  const line = xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");
  const selectedPoint =
    selected === null ? null : data[Math.min(selected, data.length - 1)];
  return (
    <div className={mini ? "mini-chart" : "chart"}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role={mini ? "img" : "group"}
        aria-label={`${data.length} jours de mesures, de ${number(values[0])} à ${number(values.at(-1)!)} ${unit}.`}
      >
        {!mini &&
          [0, 1, 2].map((i) => {
            const y = py + (i * (height - 2 * py)) / 2;
            return (
              <g key={i}>
                <line x1={px} x2={width} y1={y} y2={y} className="chart-grid" />
                <text x={0} y={y + 4} className="axis-label">
                  {number(max - (i * (max - min)) / 2, 1)}
                </text>
              </g>
            );
          })}
        {!mini && data.length > 1 && (
          <path
            d={`${line} L${xs.at(-1)},${height - py} L${xs[0]},${height - py} Z`}
            className="chart-area"
          />
        )}
        {data.length > 1 && <path d={line} className="chart-line" />}
        {data.map((d, i) => (
          <g key={d.date}>
            {!mini && (
              <circle
                cx={xs[i]}
                cy={ys[i]}
                r={26}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.date} : ${number(d.value)} ${unit}`}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(i);
                  }
                }}
              />
            )}
            <circle
              cx={xs[i]}
              cy={ys[i]}
              r={mini ? 2 : selected === i ? 5 : 3}
              className="chart-dot"
              pointerEvents="none"
            />
          </g>
        ))}
      </svg>
      {!mini && (
        <>
          <div className="chart-dates">
            <span>
              <DateLabel date={data[0].date} />
            </span>
            <span>
              <DateLabel date={data.at(-1)!.date} />
            </span>
          </div>
          <div className="point-label" aria-live="polite">
            {selectedPoint ? (
              <>
                <DateLabel date={selectedPoint.date} /> ·{" "}
                {number(selectedPoint.value)} {unit}
              </>
            ) : (
              "Touchez un point pour voir la mesure"
            )}
          </div>
        </>
      )}
    </div>
  );
}
