// Adult thresholds: https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
const zones = [
  { label: "Insuffisance pondérale", range: "< 18,5", tone: "low" },
  { label: "Corpulence normale", range: "18,5 à < 25", tone: "normal" },
  { label: "Surpoids", range: "25 à < 30", tone: "high" },
  { label: "Obésité", range: "≥ 30", tone: "very-high" },
] as const;

export function bmiZoneIndex(value: number) {
  return value < 18.5 ? 0 : value < 25 ? 1 : value < 30 ? 2 : 3;
}

export function BmiZone({ value }: { value: number }) {
  const index = bmiZoneIndex(value);
  const zone = zones[index];
  return (
    <div className="bmi-zone">
      <span className={`bmi-zone-label bmi-tone-${zone.tone}`}>
        {zone.label} · {zone.range}
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
