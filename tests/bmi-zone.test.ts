import { expect, it } from "vitest";
import { bmiZoneIndex } from "../src/components/BmiZone";

it.each([
  [18.49, 0],
  [18.5, 1],
  [24.99, 1],
  [25, 2],
  [29.99, 2],
  [30, 3],
  [45, 3],
])("classe l’IMC %s dans la zone %s avant arrondi", (value, expected) => {
  expect(bmiZoneIndex(value)).toBe(expected);
});
