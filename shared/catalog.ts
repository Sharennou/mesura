import type { AccountData, Measure } from "./types.ts";
export const STANDARD_MEASURES: Measure[] = [
  { id: "weight", name: "Poids", unit: "kg" },
  { id: "waist", name: "Tour de taille", unit: "cm" },
  { id: "hips", name: "Hanches", unit: "cm" },
  { id: "chest", name: "Poitrine", unit: "cm" },
  { id: "thigh-left", name: "Cuisse gauche", unit: "cm" },
  { id: "neck", name: "Cou", unit: "cm" },
  { id: "shoulders", name: "Épaules", unit: "cm" },
  { id: "abdomen", name: "Abdomen", unit: "cm" },
  { id: "biceps-left", name: "Biceps gauche", unit: "cm" },
  { id: "biceps-right", name: "Biceps droit", unit: "cm" },
  { id: "forearm-left", name: "Avant-bras gauche", unit: "cm" },
  { id: "forearm-right", name: "Avant-bras droit", unit: "cm" },
  { id: "thigh-right", name: "Cuisse droite", unit: "cm" },
  { id: "calf-left", name: "Mollet gauche", unit: "cm" },
  { id: "calf-right", name: "Mollet droit", unit: "cm" },
];
export const DEFAULT_VISIBLE = ["waist", "hips"];

// Keep retired values in storage, but exclude them from active product flows.
export const isActiveMeasure = (id: string) => id !== "waist-rfm";
export function retiredValues(values: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(values).filter(([id]) => !isActiveMeasure(id)),
  );
}
export function activeAccountData(account: AccountData): AccountData {
  return {
    ...account,
    profile: {
      ...account.profile,
      visible: account.profile.visible.filter(isActiveMeasure),
    },
    measures: account.measures.filter((m) => isActiveMeasure(m.id)),
    entries: account.entries
      .map((entry) => ({
        ...entry,
        values: Object.fromEntries(
          Object.entries(entry.values).filter(([id]) => isActiveMeasure(id)),
        ),
      }))
      .filter(
        (entry) =>
          Object.keys(entry.values).length ||
          entry.note.trim() ||
          entry.photos.length,
      ),
    goal:
      account.goal && isActiveMeasure(account.goal.measureId)
        ? account.goal
        : null,
  };
}
