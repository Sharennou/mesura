import type { Entry, Goal } from "./types";
export const number = (value: number, decimals = 1) =>
  new Intl.NumberFormat("fr-FR", {
    useGrouping: false,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(value)
    .replace("-", "−");
export const delta = (value: number | null, decimals = 1) =>
  value === null
    ? "—"
    : Math.abs(value) < 0.5 * 10 ** -decimals
      ? "= 0"
      : `${value > 0 ? "+" : "−"}${number(Math.abs(value), decimals)}`;
export function parseDecimal(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(normalized) &&
    Number.isFinite(Number(normalized)) &&
    Number(normalized) > 0
    ? Number(normalized)
    : NaN;
}
export const bmi = (weight?: number | null, height?: number | null) =>
  weight && height && weight > 0 && height > 0
    ? weight / (height / 100) ** 2
    : null;
export const ratio = (a?: number | null, b?: number | null) =>
  a && b && a > 0 && b > 0 ? a / b : null;
export function indicators(entry?: Entry) {
  return {
    bmi: bmi(entry?.values.weight, entry?.height),
    waistHeight: ratio(entry?.values.waist, entry?.height),
    waistHips: ratio(entry?.values.waist, entry?.values.hips),
  };
}
export function indicatorObservations(
  entries: Entry[],
  key: keyof ReturnType<typeof indicators>,
) {
  return [...entries]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    )
    .flatMap((entry) => {
      const value = indicators(entry)[key];
      return value === null
        ? []
        : [{ date: entry.date, value, entryId: entry.id }];
    });
}
export function goalProgress(goal: Goal, current: number) {
  return goal.target === goal.start
    ? null
    : Math.min(
        100,
        Math.max(
          0,
          ((current - goal.start) / (goal.target - goal.start)) * 100,
        ),
      );
}
export function dailyValues(
  entries: Entry[],
  measureId: string,
  start = "",
  end = "9999-12-31",
) {
  const days = new Map<string, number[]>();
  for (const entry of entries)
    if (
      entry.date >= start &&
      entry.date <= end &&
      entry.values[measureId] !== undefined
    )
      days.set(entry.date, [
        ...(days.get(entry.date) || []),
        entry.values[measureId],
      ]);
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }));
}
export function periodStats(
  entries: Entry[],
  measureId: string,
  start: string,
  end: string,
) {
  const values = dailyValues(entries, measureId, start, end);
  return {
    days: values.length,
    average: values.length
      ? values.reduce((s, d) => s + d.value, 0) / values.length
      : null,
    first: values[0] ?? null,
    last: values.at(-1) ?? null,
    delta: values.length > 1 ? values.at(-1)!.value - values[0].value : null,
  };
}
export function latest(entries: Entry[], id: string, before?: string) {
  return [...entries]
    .filter((e) => e.values[id] !== undefined && (!before || e.date <= before))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0];
}
const DAY = 86400000;
export function localDate(
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  now = new Date(),
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDate(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}
export function weekStart(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftDate(date, -(day + 6) % 7);
}
export function streak(entries: Entry[], today = localDate()) {
  const weeks = new Set(
    entries.filter((e) => e.date <= today).map((e) => weekStart(e.date)),
  );
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor = shiftDate(cursor, -7);
  let count = 0;
  while (weeks.has(cursor)) {
    count++;
    cursor = shiftDate(cursor, -7);
  }
  return count;
}
export function periodBounds(
  period: string,
  entries: Entry[],
  today = localDate(),
) {
  const d = new Date(`${today}T12:00:00Z`);
  const months = (
    { "1M": 1, "3M": 3, "6M": 6, "1A": 12 } as Record<string, number>
  )[period];
  if (months) {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - months);
    const last = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }
  return {
    start: months
      ? d.toISOString().slice(0, 10)
      : ([...entries].sort((a, b) => a.date.localeCompare(b.date))[0]?.date ??
        today),
    end: today,
  };
}
export function projection(entries: Entry[], goal: Goal) {
  if (goal.start === goal.target) return null;
  const data = dailyValues(entries, goal.measureId, goal.startDate).slice(-90);
  if (data.length < 4) return null;
  const origin = Date.parse(data[0].date);
  const xs = data.map((d) => (Date.parse(d.date) - origin) / DAY);
  const ys = data.map((d) => d.value);
  if (xs.at(-1)! < 21) return null;
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const xx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const xy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const slope = xy / xx;
  const yy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const r2 = yy ? xy ** 2 / (xx * yy) : 0;
  const current = ys.at(-1)!;
  const days = (goal.target - current) / slope;
  if (Math.abs(slope) < 0.005 || r2 < 0.6 || days <= 0 || days > 365)
    return null;
  return { date: shiftDate(data.at(-1)!.date, Math.ceil(days)), r2, slope };
}
