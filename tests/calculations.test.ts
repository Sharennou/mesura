import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  bmi,
  dailyValues,
  delta,
  goalProgress,
  indicators,
  localDate,
  parseDecimal,
  periodBounds,
  periodStats,
  projection,
  ratio,
  streak,
} from "../shared/calculations";
import { firstOccurrence, nextOccurrences } from "../shared/recurrence";
import type { Entry, Reminder } from "../shared/types";
function entry(
  date: string,
  values: Record<string, number>,
  height: number | null = 175,
): Entry {
  return {
    id: crypto.randomUUID(),
    date,
    createdAt: `${date}T08:00:00Z`,
    height,
    values,
    note: "",
    photos: [],
  };
}
describe("Saisie et indicateurs", () => {
  it.each([
    ["78,4", 78.4],
    ["78.4", 78.4],
    [" 78,4 ", 78.4],
    ["", null],
    [" ", null],
  ])("accepte %s", (input, expected) =>
    expect(parseDecimal(input)).toBe(expected),
  );
  it.each(["0", "-1", "NaN", "Infinity", "1e2", "12abc", "1,2,3", ".5"])(
    "rejette %s",
    (input) => expect(Number.isNaN(parseDecimal(input))).toBe(true),
  );
  it("calcule l’IMC sans arrondir la source", () =>
    expect(bmi(78.4, 175)).toBeCloseTo(25.6, 8));
  it("n’invente pas les valeurs absentes et protège les divisions", () => {
    expect(bmi(null, 175)).toBeNull();
    expect(bmi(70, 0)).toBeNull();
    expect(ratio(84, 0)).toBeNull();
    expect(ratio(undefined, 100)).toBeNull();
  });
  it("conserve la stature historique et les ratios d’une même entrée", () => {
    const e = entry("2026-09-01", { weight: 70, waist: 84, hips: 100 }, 175);
    expect(indicators(e).bmi).toBeCloseTo(22.8571, 4);
    expect(indicators(e).waistHeight).toBe(0.48);
    expect(indicators(e).waistHips).toBe(0.84);
    expect(indicators(entry("2026-09-02", { waist: 83 })).waistHips).toBeNull();
  });
  it("utilise le vrai signe moins et arrondit à l’affichage", () => {
    expect(delta(-0.6)).toBe("−0,6");
    expect(delta(0.3)).toBe("+0,3");
    expect(delta(0)).toBe("= 0");
    expect(delta(null)).toBe("—");
    expect(delta(-0.001)).toBe("= 0");
  });
  it("utilise le jour local", () => {
    expect(localDate("Europe/Paris", new Date("2026-10-04T23:30:00Z"))).toBe(
      "2026-10-05",
    );
    expect(
      localDate("America/Montreal", new Date("2026-10-04T23:30:00Z")),
    ).toBe("2026-10-04");
  });
});
describe("Objectifs et agrégations", () => {
  it.each([
    [86, 75, 80, 54.5454545],
    [60, 70, 65, 50],
    [60, 70, 75, 100],
    [86, 75, 90, 0],
  ])("fonctionne dans les deux directions", (start, target, current, result) =>
    expect(
      goalProgress(
        { measureId: "weight", start, target, startDate: "2026-09-01" },
        current,
      ),
    ).toBeCloseTo(result, 5),
  );
  it("traite le maintien sans division", () =>
    expect(
      goalProgress(
        { measureId: "weight", start: 70, target: 70, startDate: "2026-09-01" },
        70,
      ),
    ).toBeNull());
  const entries = [
    entry("2026-09-01", { weight: 80 }),
    entry("2026-09-01", { weight: 82 }),
    entry("2026-09-03", { weight: 75 }),
    entry("2026-09-04", { waist: 84 }),
  ];
  it("moyenne les jours avant les périodes", () => {
    expect(dailyValues(entries, "weight")).toEqual([
      { date: "2026-09-01", value: 81 },
      { date: "2026-09-03", value: 75 },
    ]);
    const stats = periodStats(entries, "weight", "2026-09-01", "2026-09-30");
    expect(stats.average).toBe(78);
    expect(stats.days).toBe(2);
    expect(stats.delta).toBe(-6);
  });
  it("n’estime pas les jours absents et accepte des périodes inégales", () => {
    expect(
      periodStats(entries, "weight", "2026-08-01", "2026-08-31").average,
    ).toBeNull();
    expect(
      periodStats(entries, "weight", "2026-09-01", "2026-09-01").average,
    ).toBe(81);
  });
  it("borne les mois sans débordement du calendrier", () =>
    expect(periodBounds("1M", [], "2026-03-31").start).toBe("2026-02-28"));
  it("compte les semaines calendaires sans casser la semaine ouverte", () => {
    const es = [
      entry("2026-09-21", { weight: 80 }),
      entry("2026-09-28", { weight: 79 }),
    ];
    expect(streak(es, "2026-10-05")).toBe(2);
    expect(streak(es, "2026-10-12")).toBe(0);
    expect(
      streak([...es, entry("2026-10-05", { weight: 78 })], "2026-10-05"),
    ).toBe(3);
  });
  it("ne compte ni les entrées futures ni les semaines en double", () =>
    expect(
      streak(
        [
          entry("2026-10-05", { weight: 78 }),
          entry("2026-10-06", { weight: 78 }),
          entry("2026-10-12", { weight: 78 }),
        ],
        "2026-10-05",
      ),
    ).toBe(1));
  it("projette uniquement une tendance stable et suffisante", () => {
    const goal = {
      measureId: "weight",
      start: 80,
      target: 75,
      startDate: "2026-09-01",
    };
    const es = [80, 79.5, 79, 78.5].map((w, i) =>
      entry(`2026-09-${String(1 + i * 7).padStart(2, "0")}`, { weight: w }),
    );
    expect(projection(es, goal)?.date).toBe("2026-11-10");
    expect(projection(es.slice(0, 3), goal)).toBeNull();
    expect(projection(es, { ...goal, target: 90 })).toBeNull();
    expect(
      projection(
        es.map((e) => ({ ...e, values: { weight: 80 } })),
        goal,
      ),
    ).toBeNull();
    expect(projection(es, { ...goal, target: 30 })).toBeNull();
  });
});
describe("Récurrences locales", () => {
  const r: Reminder = {
    enabled: true,
    weekday: 1,
    frequency: "week",
    time: "08:00",
    timezone: "Europe/Paris",
    anchor: "2026-10-19",
    channel: "push",
  };
  it("préserve 08:00 au passage à l’heure d’hiver", () => {
    const dates = nextOccurrences(
      r,
      DateTime.fromISO("2026-10-18T12:00:00Z"),
      3,
    );
    expect(dates).toEqual([
      "2026-10-19T06:00:00.000Z",
      "2026-10-26T07:00:00.000Z",
      "2026-11-02T07:00:00.000Z",
    ]);
  });
  it("programme exactement quinze jours calendaires", () => {
    const dates = nextOccurrences(
      { ...r, frequency: "fortnight" },
      DateTime.fromISO("2026-10-18T12:00:00Z"),
    );
    expect(
      dates.map((d) => DateTime.fromISO(d).setZone(r.timezone).toISODate()),
    ).toEqual(["2026-10-19", "2026-11-03", "2026-11-18"]);
  });
  it("utilise le quatrième lundi si le cinquième n’existe pas", () => {
    const dates = nextOccurrences(
      { ...r, frequency: "month", anchor: "2026-03-30" },
      DateTime.fromISO("2026-03-29T12:00:00Z"),
    );
    expect(
      dates.map((d) => DateTime.fromISO(d).setZone(r.timezone).toISODate()),
    ).toEqual(["2026-03-30", "2026-04-27", "2026-05-25"]);
  });
  it("gère le printemps et une heure inexistante selon le navigateur de calendrier", () => {
    const spring = { ...r, weekday: 7, time: "02:30", anchor: "2026-03-22" };
    const dates = nextOccurrences(
      spring,
      DateTime.fromISO("2026-03-21T12:00:00Z"),
    );
    expect(
      DateTime.fromISO(dates[1]).setZone(r.timezone).toFormat("HH:mm"),
    ).toBe("03:30");
    expect(
      DateTime.fromISO(dates[2]).setZone(r.timezone).toFormat("HH:mm"),
    ).toBe("02:30");
  });
  it("ne renvoie pas une occurrence déjà passée", () =>
    expect(
      firstOccurrence(
        1,
        "08:00",
        "Europe/Paris",
        DateTime.fromISO("2026-10-05T09:00:00Z"),
      ),
    ).toBe("2026-10-12"));
});
