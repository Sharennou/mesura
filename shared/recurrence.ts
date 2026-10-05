import { DateTime } from "luxon";
import type { Reminder } from "./types.ts";
export function firstOccurrence(
  weekday: number,
  time: string,
  zone: string,
  now: DateTime = DateTime.now(),
) {
  const local = now.setZone(zone);
  const [hour, minute] = time.split(":").map(Number);
  if (!local.isValid || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "";
  let next = local
    .startOf("day")
    .plus({ days: (weekday - local.weekday + 7) % 7 })
    .set({ hour, minute });
  if (next <= local) next = next.plus({ weeks: 1 });
  return next.toISODate()!;
}
export function nextOccurrences(
  reminder: Reminder,
  now: DateTime = DateTime.now(),
  count = 3,
): string[] {
  if (
    !reminder.anchor ||
    !DateTime.now().setZone(reminder.timezone).isValid ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time)
  )
    return [];
  const [hour, minute] = reminder.time.split(":").map(Number);
  const anchor = DateTime.fromISO(reminder.anchor, { zone: reminder.timezone });
  if (!anchor.isValid) return [];
  const results: string[] = [];
  const rank = Math.ceil(anchor.day / 7);
  let index = 0;
  while (results.length < count && index < 20000) {
    let date: DateTime;
    if (reminder.frequency === "month") {
      const month = anchor.startOf("month").plus({ months: index });
      const offset = (reminder.weekday - month.weekday + 7) % 7;
      date = month.plus({ days: offset + (rank - 1) * 7 });
      if (date.month !== month.month) date = date.minus({ weeks: 1 });
    } else
      date = anchor.plus({
        days: index * (reminder.frequency === "fortnight" ? 15 : 7),
      });
    date = date.set({ hour, minute, second: 0, millisecond: 0 });
    index++;
    if (date > now) results.push(date.toUTC().toISO()!);
  }
  return results;
}
