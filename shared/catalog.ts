import type { Measure } from "./types.ts";
export const STANDARD_MEASURES: Measure[] = [
  { id: "weight", name: "Poids", unit: "kg" },
  { id: "waist", name: "Tour de taille", unit: "cm" },
  { id: "waist-rfm", name: "Tour de taille — RFM", unit: "cm" },
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
export const DEFAULT_VISIBLE = ["waist", "hips", "chest", "thigh-left"];
