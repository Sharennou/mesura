import type { AccountData } from "../shared/types";
import { STANDARD_MEASURES, DEFAULT_VISIBLE } from "../shared/catalog";
import { localDate, shiftDate } from "../shared/calculations";
export function demoData(): AccountData {
  const today = localDate();
  const weights = [
    82.1, 81.8, 81.4, 81.6, 80.9, 80.5, 80.7, 80.0, 79.6, 79.4, 79.0, 78.4,
  ];
  return {
    profile: {
      name: "Camille",
      height: 175,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      visible: DEFAULT_VISIBLE,
    },
    entries: weights.map((w, i) => ({
      id: `demo-${i}`,
      date: shiftDate(today, -(11 - i) * 7 - 7),
      createdAt: `${shiftDate(today, -(11 - i) * 7 - 7)}T08:00:00Z`,
      height: 175,
      values: {
        weight: w,
        waist: +(89 - i * 0.4).toFixed(1),
        hips: +(102 - i * 0.2).toFixed(1),
        chest: +(99 - i * 0.15).toFixed(1),
        "thigh-left": +(58 - i * 0.1).toFixed(1),
      },
      note: i === 11 ? "Même heure, mêmes repères. On garde le rythme." : "",
      photos: [],
    })),
    measures: STANDARD_MEASURES,
    goal: {
      measureId: "weight",
      start: 86,
      target: 75,
      startDate: shiftDate(today, -120),
    },
    consents: { body: false, photos: false, push: false, email: false },
    reminder: null,
    devices: 0,
  };
}
