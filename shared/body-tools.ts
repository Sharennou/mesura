import type { Entry } from "./types.ts";
import { bmi, ratio, number } from "./calculations.ts";

/** Immutable algorithm identifier: add a new implementation before changing rules. */
export const TOOL_VERSION = "mesura-tools-v1" as const;
export type Equation = "unspecified" | "male" | "female";
export type Situation =
  "unknown" | "none" | "pregnancy" | "breastfeeding" | "altered";
export type WaistProtocol = "unknown" | "nice-midpoint" | "iliac-crest";
export interface ToolProfile {
  birthDate: string | null;
  equation: Equation;
  situation?: Situation;
  waistProtocol?: WaistProtocol;
  rfmWaistProtocol?: "unknown" | "iliac-crest";
}
export interface ToolContext extends ToolProfile {
  version: typeof TOOL_VERSION;
  situation: Situation;
  waistProtocol: WaistProtocol;
  rfmWaistProtocol: "unknown" | "iliac-crest";
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
  situation: profile.situation ?? "unknown",
  waistProtocol: profile.waistProtocol ?? "unknown",
  rfmWaistProtocol: profile.rfmWaistProtocol ?? "unknown",
  heightDate: null,
  heightOrigin: "legacy",
});
export const PROTOCOL_LABELS: Record<WaistProtocol, string> = {
  unknown: "Protocole inconnu",
  "nice-midpoint": "Mi-distance côte–crête iliaque (NICE)",
  "iliac-crest": "Bord supérieur de la crête iliaque droite (RFM)",
};
export const SITUATION_LABELS: Record<Situation, string> = {
  unknown: "Non renseignée",
  none: "Aucune de ces situations",
  pregnancy: "Grossesse",
  breastfeeding: "Allaitement",
  altered: "Condition modifiant fortement la composition corporelle",
};
export const EQUATION_LABELS: Record<Equation, string> = {
  unspecified: "Non renseigné",
  male: "Équation masculine",
  female: "Équation féminine",
};
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
export function rfm(
  height: unknown,
  waist: unknown,
  equation: Equation,
  heightUnit = "cm",
  waistUnit = "cm",
) {
  const r = ratio(lengthCm(height, heightUnit), lengthCm(waist, waistUnit));
  if (r === null || !["male", "female"].includes(equation)) return null;
  const value = (equation === "male" ? 64 : 76) - 20 * r;
  return positive(value) && value < 100 ? value : null;
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
  if (!context || context.version !== TOOL_VERSION)
    return "Contexte de cette séance non renseigné. Complétez les données pour activer cet outil.";
  const age = ageAt(context.birthDate, date);
  if (age === null)
    return "Date de naissance manquante ou incompatible avec la date de la séance.";
  if (age < min || (max !== undefined && age > max))
    return max === undefined
      ? "Les repères adultes ne sont pas appliqués avant 18 ans."
      : `Calcul automatique réservé à ${min}–${max} ans dans cette version de Mesura (âge à la séance : ${age} ans).`;
  if (context.situation === "unknown")
    return "Renseignez la situation à la date de cette séance.";
  if (context.situation !== "none")
    return "Estimation et classification suspendues pour cette situation (grossesse, allaitement ou composition corporelle particulière). Un avis professionnel adapté est nécessaire.";
  return null;
}
function heightEligibility(entry: Entry): string | null {
  if (!positive(entry.height))
    return "Hauteur corporelle manquante ou invalide.";
  const date = entry.tools?.heightDate;
  if (!validDate(date))
    return "Date de mesure de la hauteur inconnue. Vérifiez sa provenance avant le calcul.";
  if (date > entry.date)
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
      c?.waistProtocol !== "nice-midpoint"
        ? "Mesurez le tour de taille à mi-distance côte–crête iliaque selon NICE. Le protocole actuel est différent ou inconnu."
        : null,
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
  const rfmReason =
    predictiveReason(20, 69) ||
    (c?.rfmWaistProtocol !== "iliac-crest"
      ? "Une mesure spécifique au bord supérieur de la crête iliaque droite est nécessaire pour le RFM."
      : null) ||
    (!positive(entry.values["waist-rfm"])
      ? "Ajoutez le tour de taille spécifique au RFM dans cette séance."
      : null);
  const rfmValue = rfmReason
    ? null
    : rfm(entry.height, entry.values["waist-rfm"], c!.equation);
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
      category: abdominalReason ? null : classifyAbdominal(rth, b),
    },
    rfm: {
      value: rfmValue,
      reason:
        rfmReason ||
        (rfmValue === null
          ? "Résultat non interprétable : vérifiez les valeurs, les unités et le repère de mesure. Aucun pourcentage n’est corrigé automatiquement."
          : null),
    } satisfies ToolResult,
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
