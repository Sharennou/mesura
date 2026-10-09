import type { Entry } from "./types.ts";
import { bmi, ratio, number } from "./calculations.ts";

/** Current calculation rules; legacy context identifiers remain readable. */
export const TOOL_VERSION = "mesura-tools-v2" as const;
export const LEGACY_TOOL_VERSION = "mesura-tools-v1" as const;
export type Equation = "unspecified" | "male" | "female";
export type WaistProtocol = "unknown" | "nice-midpoint" | "iliac-crest";
export interface ToolProfile {
  birthDate: string | null;
  equation: Equation;
  waistProtocol?: WaistProtocol;
}
export interface ToolContext extends ToolProfile {
  version: typeof TOOL_VERSION | typeof LEGACY_TOOL_VERSION;
  waistProtocol: WaistProtocol;
  heightDate: string | null;
  heightOrigin: "session" | "profile" | "legacy";
}
export const EMPTY_TOOL_PROFILE: ToolProfile = {
  birthDate: null,
  equation: "unspecified",
};
export const newToolContext = (
  profile: ToolProfile = EMPTY_TOOL_PROFILE,
): ToolContext => ({
  ...profile,
  version: TOOL_VERSION,
  waistProtocol: profile.waistProtocol ?? "unknown",
  heightDate: null,
  heightOrigin: "legacy",
});
// The standard entry fields follow their catalogue guides. Saved sessions keep
// their original context, including unknown legacy protocols.
export function newMeasurementToolContext(
  profile?: ToolProfile,
  heightDate: string | null = null,
): ToolContext {
  return {
    ...newToolContext(profile),
    waistProtocol: profile?.waistProtocol ?? "nice-midpoint",
    heightDate,
    heightOrigin: "profile",
  };
}
export function validDate(date: unknown): date is string {
  return (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date + "T12:00:00Z")) &&
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date
  );
}
export function ageAt(birthDate: unknown, date: string): number | null {
  if (!validDate(birthDate) || !validDate(date) || birthDate > date)
    return null;
  return (
    Number(date.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (date.slice(5) < birthDate.slice(5) ? 1 : 0)
  );
}
export const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
export function lengthCm(value: unknown, unit: string): number | null {
  if (!positive(value) || !["cm", "m"].includes(unit)) return null;
  const result = unit === "m" ? value * 100 : value;
  return positive(result) ? result : null;
}
export function weightKg(value: unknown, unit: string): number | null {
  if (!positive(value) || !["kg", "g"].includes(unit)) return null;
  const result = unit === "g" ? value / 1000 : value;
  return positive(result) ? result : null;
}
export function waistHeight(
  waist: unknown,
  height: unknown,
  waistUnit = "cm",
  heightUnit = "cm",
) {
  return ratio(lengthCm(waist, waistUnit), lengthCm(height, heightUnit));
}
export function mifflin(
  weight: unknown,
  height: unknown,
  age: unknown,
  equation: Equation,
  weightUnit = "kg",
  heightUnit = "cm",
) {
  const w = weightKg(weight, weightUnit),
    h = lengthCm(height, heightUnit);
  if (
    w === null ||
    h === null ||
    !positive(age) ||
    !["male", "female"].includes(equation)
  )
    return null;
  const value = 10 * w + 6.25 * h - 5 * age + (equation === "male" ? 5 : -161);
  return positive(value) ? value : null;
}
export const ABDOMINAL_THRESHOLDS = [0.4, 0.5, 0.6] as const;
export const ABDOMINAL_BMI_LIMIT = 35;
export const BMI_THRESHOLDS = [18.5, 25, 30] as const;
export function bmiZoneIndex(value: number) {
  return value < BMI_THRESHOLDS[0]
    ? 0
    : value < BMI_THRESHOLDS[1]
      ? 1
      : value < BMI_THRESHOLDS[2]
        ? 2
        : 3;
}
export type AbdominalClass = "below" | "reference" | "increased" | "high";
export const ABDOMINAL_LABELS: Record<AbdominalClass, string> = {
  below: "Sous la plage de classification retenue (RTH < 0,40)",
  reference:
    "Adiposité abdominale dans la plage de référence (0,40 ≤ RTH < 0,50)",
  increased: "Adiposité abdominale augmentée (0,50 ≤ RTH < 0,60)",
  high: "Adiposité abdominale élevée (RTH ≥ 0,60)",
};
export function classifyAbdominal(
  value: number | null,
  associatedBmi: number | null,
): AbdominalClass | null {
  if (
    !positive(value) ||
    !positive(associatedBmi) ||
    associatedBmi >= ABDOMINAL_BMI_LIMIT
  )
    return null;
  return value < ABDOMINAL_THRESHOLDS[0]
    ? "below"
    : value < ABDOMINAL_THRESHOLDS[1]
      ? "reference"
      : value < ABDOMINAL_THRESHOLDS[2]
        ? "increased"
        : "high";
}
export function adultEligibility(
  context: ToolContext | undefined,
  date: string,
  min = 18,
  max?: number,
): string | null {
  if (
    !context ||
    ![TOOL_VERSION, LEGACY_TOOL_VERSION].includes(context.version)
  )
    return "La date de naissance et le sexe ne sont pas connus pour cette séance.";
  const age = ageAt(context.birthDate, date);
  if (age === null)
    return "Date de naissance manquante ou incompatible avec la date de la séance.";
  if (age < min || (max !== undefined && age > max))
    return max === undefined
      ? "Les repères adultes ne sont pas appliqués avant 18 ans."
      : `Calcul automatique réservé à ${min}–${max} ans dans cette version de Mesura (âge à la séance : ${age} ans).`;
  return null;
}
function heightEligibility(entry: Entry): string | null {
  if (!positive(entry.height))
    return "Hauteur corporelle manquante ou invalide.";
  const date = entry.tools?.heightDate;
  if (validDate(date) && date > entry.date)
    return "La hauteur provient d’une date ultérieure à cette séance. Renseignez une hauteur mesurée à cette date ou avant.";
  return null;
}
export interface ToolResult {
  value: number | null;
  reason: string | null;
}
export function entryTools(entry: Entry) {
  const c = entry.tools;
  const knownFuture = validDate(c?.heightDate) && c!.heightDate! > entry.date;
  const b = knownFuture ? null : bmi(entry.values.weight, entry.height);
  const rth = knownFuture
    ? null
    : waistHeight(entry.values.waist, entry.height);
  const adultReason = adultEligibility(c, entry.date);
  const abdominalReason =
    [
      b === null
        ? "IMC absent : renseignez un poids et une hauteur valides pour cette séance avant la classification NICE."
        : b >= ABDOMINAL_BMI_LIMIT
          ? "IMC ≥ 35 kg/m² : la classification automatique NICE retenue ne s’applique pas."
          : null,
      adultReason,
      heightEligibility(entry),
      rth === null ? "Ajoutez un tour de taille valide à cette séance." : null,
    ]
      .filter(Boolean)
      .join(" ") || null;
  const predictiveReason = (min: number, max: number) =>
    adultEligibility(c, entry.date, min, max) ||
    (c?.equation === "unspecified"
      ? "Choisissez explicitement une équation masculine ou féminine."
      : null) ||
    heightEligibility(entry);
  const energyReason =
    predictiveReason(19, 78) ||
    (!positive(entry.values.weight)
      ? "Ajoutez le poids de cette séance en kilogrammes."
      : null);
  const energyValue = energyReason
    ? null
    : mifflin(
        entry.values.weight,
        entry.height,
        ageAt(c?.birthDate, entry.date),
        c!.equation,
      );
  return {
    bmi: b,
    bmiReason: adultReason,
    waistHips: ratio(entry.values.waist, entry.values.hips),
    abdominal: {
      value: rth,
      reason: abdominalReason,
      category:
        !abdominalReason && c?.waistProtocol === "nice-midpoint"
          ? classifyAbdominal(rth, b)
          : null,
    },
    energy: {
      value: energyValue,
      reason:
        energyReason ||
        (energyValue === null
          ? "Résultat non interprétable : vérifiez le poids, la hauteur et la date de naissance."
          : null),
    } satisfies ToolResult,
  };
}
export function orderedSessions(entries: Entry[], end: string, start = "") {
  return entries
    .filter((e) => validDate(e.date) && e.date <= end && e.date >= start)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}
/** Increase display precision near boundaries; never let rounding cross a category. */
export function thresholdNumber(
  value: number,
  thresholds: readonly number[],
  decimals = 2,
) {
  for (let d = decimals; d <= 12; d++) {
    const rounded = Number(value.toFixed(d));
    if (thresholds.every((t) => value < t === rounded < t))
      return number(value, d);
  }
  return value.toLocaleString("fr-FR", {
    maximumSignificantDigits: 17,
    useGrouping: false,
  });
}
