import { bmiZoneIndex } from "../../shared/body-tools";
export { bmiZoneIndex } from "../../shared/body-tools";
// Adult thresholds: https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
const zones = [
  { range: "< 18,5", tone: "low" },
  { range: "18,5 à < 25", tone: "normal" },
  { range: "25 à < 30", tone: "high" },
  { range: "≥ 30", tone: "very-high" },
] as const;

export function BmiZone({ value }: { value: number }) {
  const index = bmiZoneIndex(value);
  const zone = zones[index];
  return (
    <div className="bmi-zone">
      <span className={`bmi-zone-label bmi-tone-${zone.tone}`}>
        {zone.range}
      </span>
      <div className="bmi-zone-scale" aria-hidden="true">
        {zones.map((item, i) => (
          <span
            key={item.tone}
            className={`bmi-tone-${item.tone}${i === index ? " is-current" : ""}`}
          />
        ))}
      </div>
      <small className="muted">Repères adultes</small>
    </div>
  );
}
