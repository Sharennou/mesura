import { useId, type Ref } from "react";
import { ChevronDown, Ruler, Scale } from "lucide-react";
import { Icon } from "../components";
import { useViewState } from "../useViewState";
import {
  measurementInstructions,
  type GuideRegion,
} from "../measurement-guide";
import type { Measure } from "../../shared/types";

function Tape({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g className="guide-tape">
      <ellipse cx={x} cy={y} rx={width / 2} ry={6} />
      <path d={`M ${x - width / 2} ${y} q ${width / 2} 14 ${width} 0`} />
      {[-0.3, -0.1, 0.1, 0.3].map((offset) => (
        <path key={offset} d={`M ${x + width * offset} ${y + 2} v 5`} />
      ))}
    </g>
  );
}

function Label({
  x,
  y,
  lines,
  startX = 133,
  startY = y - 4,
  target = false,
}: {
  x: number;
  y: number;
  lines: string[];
  startX?: number;
  startY?: number;
  target?: boolean;
}) {
  return (
    <g className={target ? "guide-target-label" : "guide-landmark-label"}>
      <path d={`M ${startX} ${startY} H ${x - 12} V ${y - 4} H ${x - 4}`} />
      <circle cx={startX} cy={startY} r={3} />
      <text x={x} y={y}>
        {lines.map((line, index) => (
          <tspan key={line} x={x} dy={index ? 15 : 0}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function Diagram({
  region,
  name,
  landmark,
  side,
}: {
  region: GuideRegion;
  name: string;
  landmark: string;
  side?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const arm = region === "biceps" || region === "forearm";
  const leg = region === "thigh" || region === "calf";
  const torsoY = {
    neck: 59,
    shoulders: 84,
    chest: 111,
    waist: 155,
    "waist-rfm": 178,
    abdomen: 175,
    hips: 208,
  };
  return (
    <figure className="guide-figure">
      <svg
        viewBox="0 0 320 260"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{name} : placement du ruban</title>
        <desc id={descriptionId}>
          {landmark} Le ruban vert montre le tour à mesurer.{" "}
          {side ? `Le schéma représente votre ${side}.` : "Vue de face."}
        </desc>
        <g className="guide-body">
          {arm ? (
            <>
              <path d="M 55 23 Q 79 6 107 27 Q 120 46 110 76 L 99 125 Q 97 134 104 151 Q 114 172 107 195 L 96 224 L 98 239 Q 95 248 88 242 L 73 231 L 69 225 L 62 237 Q 57 241 55 234 L 60 218 L 72 186 Q 79 169 77 150 Q 69 132 65 116 L 47 70 Q 36 47 55 23 Z" />
              <path d="M 73 125 Q 85 130 99 125 M 73 214 L 94 221" />
              <circle cx="82" cy="25" r="3" />
              {region === "biceps" ? (
                <>
                  <path
                    className="guide-reference"
                    d="M 127 25 h 8 v 102 h -8 M 128 76 h 7"
                  />
                  <Tape x={81} y={76} width={56} />
                  <Label
                    x={182}
                    y={35}
                    startX={82}
                    startY={25}
                    lines={["Pointe de", "l’épaule"]}
                  />
                  <Label
                    x={182}
                    y={91}
                    startX={109}
                    startY={76}
                    lines={["Milieu du", "haut du bras"]}
                    target
                  />
                  <Label
                    x={182}
                    y={154}
                    startX={99}
                    startY={127}
                    lines={["Pointe", "du coude"]}
                  />
                </>
              ) : (
                <>
                  <Tape x={91} y={160} width={41} />
                  <Label
                    x={182}
                    y={113}
                    startX={99}
                    startY={127}
                    lines={["Coude"]}
                  />
                  <Label
                    x={182}
                    y={167}
                    startX={112}
                    startY={160}
                    lines={["Tour maximal", "sous le coude"]}
                    target
                  />
                  <Label
                    x={182}
                    y={227}
                    startX={95}
                    startY={223}
                    lines={["Main ouverte", "muscle relâché"]}
                  />
                </>
              )}
            </>
          ) : leg ? (
            <>
              <path d="M 48 17 Q 69 12 117 17 Q 130 37 127 71 Q 124 113 109 139 Q 104 152 114 176 Q 125 203 107 227 L 104 239 L 121 246 Q 124 252 115 253 L 64 253 Q 60 250 65 244 L 80 232 L 77 215 Q 64 191 67 177 Q 70 154 63 139 Q 47 112 47 83 Q 40 57 48 17 Z" />
              <path d="M 48 45 Q 83 56 120 42 M 73 147 Q 91 154 107 145 M 79 230 L 104 231" />
              {region === "thigh" ? (
                <>
                  <path
                    className="guide-reference"
                    d="M 141 49 h 7 v 98 h -7 M 142 98 h 6"
                  />
                  <Tape x={85} y={98} width={75} />
                  <Label
                    x={186}
                    y={37}
                    startX={122}
                    startY={48}
                    lines={["Pli de l’aine"]}
                  />
                  <Label
                    x={186}
                    y={100}
                    startX={122}
                    startY={98}
                    lines={["Milieu de", "la cuisse"]}
                    target
                  />
                  <Label
                    x={186}
                    y={160}
                    startX={107}
                    startY={147}
                    lines={["Haut de", "la rotule"]}
                  />
                </>
              ) : (
                <>
                  <Tape x={91} y={186} width={52} />
                  <Label
                    x={182}
                    y={133}
                    startX={108}
                    startY={147}
                    lines={["Genou"]}
                  />
                  <Label
                    x={182}
                    y={188}
                    startX={117}
                    startY={186}
                    lines={["Tour maximal", "du mollet"]}
                    target
                  />
                  <Label
                    x={182}
                    y={238}
                    startX={105}
                    startY={235}
                    lines={["Pied à plat"]}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <ellipse cx={90} cy={30} rx={20} ry={25} />
              <path d="M 75 48 L 73 65 Q 52 65 35 79 Q 19 100 21 129 L 15 188 Q 14 197 23 198 L 33 188 L 40 117 L 47 108 Q 47 136 53 153 Q 56 169 45 191 Q 35 215 43 247 M 105 48 L 107 65 Q 128 65 145 79 Q 161 100 159 129 L 165 188 Q 166 197 157 198 L 147 188 L 140 117 L 133 108 Q 133 136 127 153 Q 124 169 135 191 Q 145 215 137 247 M 43 247 L 73 250 L 82 229 Q 90 224 98 229 L 107 250 L 137 247" />
              <path d="M 68 81 Q 90 90 112 81 M 48 110 Q 66 120 83 108 M 97 108 Q 114 120 132 110 M 48 210 Q 90 230 132 210" />
              <circle cx={90} cy={175} r={2.5} />
              {region === "waist-rfm" && (
                <path
                  className="guide-reference"
                  d="M 51 182 Q 58 172 66 176"
                />
              )}
              {region === "waist" && (
                <>
                  <path
                    className="guide-reference"
                    d="M 52 136 Q 90 146 128 136 M 51 182 Q 58 172 66 176 M 114 176 Q 122 172 129 182 M 138 137 h 7 v 40 h -7"
                  />
                  <Label
                    x={182}
                    y={126}
                    startX={128}
                    startY={137}
                    lines={["Dernière côte"]}
                  />
                  <Label
                    x={182}
                    y={207}
                    startX={129}
                    startY={178}
                    lines={["Haut de l’os", "du bassin"]}
                  />
                </>
              )}
              <Tape
                x={90}
                y={torsoY[region as keyof typeof torsoY]}
                width={
                  region === "neck"
                    ? 34
                    : region === "shoulders"
                      ? 128
                      : region === "hips"
                        ? 102
                        : region === "waist"
                          ? 77
                          : region === "abdomen"
                            ? 82
                            : 88
                }
              />
              <Label
                x={182}
                y={torsoY[region as keyof typeof torsoY] + 3}
                startX={
                  region === "waist-rfm"
                    ? 51
                    : region === "neck"
                      ? 107
                      : region === "shoulders"
                        ? 154
                        : region === "hips"
                          ? 141
                          : 133
                }
                startY={torsoY[region as keyof typeof torsoY]}
                target
                lines={
                  {
                    waist: ["Ruban au milieu"],
                    "waist-rfm": [
                      "Bord supérieur de la",
                      "crête iliaque droite",
                    ],
                    hips: ["Tour maximal", "des fesses"],
                    chest: ["Partie la plus", "volumineuse"],
                    neck: ["Sous le larynx"],
                    shoulders: ["Milieu des", "deux deltoïdes"],
                    abdomen: ["Au nombril"],
                    biceps: [],
                    forearm: [],
                    thigh: [],
                    calf: [],
                  }[region]
                }
              />
            </>
          )}
        </g>
      </svg>
      <figcaption>
        <span className="guide-tape-key" /> Ruban autour de la zone mesurée ·
        schéma de repérage{side ? ` · ${side}` : " · vue de face"}
      </figcaption>
    </figure>
  );
}

export function MeasurementGuide({
  measures,
  favorites,
  ref,
}: {
  measures: Measure[];
  favorites: string[];
  ref?: Ref<HTMLDetailsElement>;
}) {
  const available = measures.filter((m) => !m.archived);
  const preferred = favorites.flatMap((id) =>
    available.filter((m) => m.id === id),
  );
  const [selectedId, setSelectedId] = useViewState(
    "measure.guide.selected",
    preferred[0]?.id ?? available[0]?.id ?? "waist",
  );
  const [open, setOpen] = useViewState("measure.guide.open", false);
  const selectable = measures.filter((m) => !m.archived || m.id === selectedId);
  const others = selectable.filter(
    (m) => !preferred.some((p) => p.id === m.id),
  );
  const selected =
    selectable.find((m) => m.id === selectedId) ?? preferred[0] ?? available[0];
  const guide =
    selected && !selected.custom
      ? measurementInstructions(selected.id)
      : undefined;
  const side = selected?.id.endsWith("-left")
    ? "côté gauche"
    : selected?.id.endsWith("-right")
      ? "côté droit"
      : undefined;
  const selectId = useId();
  return (
    <details
      id="measurement-guide"
      ref={ref}
      className="measurement-guide"
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open !== open) setOpen(e.currentTarget.open);
      }}
    >
      <summary>
        <span className="guide-icon">
          <Icon as={Ruler} size={24} />
        </span>
        <span>
          <strong>Guide des mesures</strong>
          <small>Où placer le ruban, comment mesurer.</small>
        </span>
        <Icon as={ChevronDown} size={20} />
      </summary>
      <div className="guide-content">
        <p className="guide-intro">
          Des repères précis pour refaire vos mensurations au même endroit.
        </p>
        <label className="guide-select-label" htmlFor={selectId}>
          Quelle mensuration ?
        </label>
        <select
          id={selectId}
          value={selected?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {preferred.length > 0 && (
            <optgroup label="Vos favorites">
              {preferred.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Toutes les autres mensurations">
              {others.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {selected && (
          <article
            className="guide-instructions"
            aria-labelledby="guide-measure-title"
          >
            <div className="guide-measure-heading">
              <h3 id="guide-measure-title" tabIndex={-1}>
                {selected.name}
              </h3>
              <span>{selected.unit}</span>
            </div>
            {side && (
              <p className="guide-side">
                <strong>
                  {side === "côté gauche" ? "Côté gauche" : "Côté droit"}
                </strong>{" "}
                de votre corps. Gardez ce côté à chaque séance.
              </p>
            )}
            {selected.id === "weight" ? (
              <>
                <div className="guide-custom-illustration" aria-hidden="true">
                  <Icon as={Scale} size={48} />
                  <span>La même balance, au même endroit</span>
                </div>
                <ol className="guide-steps">
                  <li>Posez la balance sur un sol dur, plat et stable.</li>
                  <li>
                    Pesez-vous dans des conditions similaires, à la même heure
                    et avec une tenue comparable.
                  </li>
                  <li>
                    Restez immobile au centre de la balance. Attendez que la
                    valeur se stabilise et notez-la en kg.
                  </li>
                </ol>
              </>
            ) : guide ? (
              <>
                <p className="guide-landmark">{guide.landmark}</p>
                <Diagram
                  region={guide.region}
                  name={selected.name}
                  landmark={guide.landmark}
                  side={side}
                />
                <ol className="guide-steps">
                  {guide.steps.map((step) => (
                    <li key={step}>
                      <strong>{step.slice(0, step.indexOf(" "))}</strong>
                      {step.slice(step.indexOf(" "))}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <div className="guide-custom-illustration" aria-hidden="true">
                  <Icon as={Ruler} size={48} />
                  <span>Repère à définir</span>
                </div>
                <p>Mesure personnalisée : choisissez votre propre repère.</p>
                <ol className="guide-steps">
                  <li>Choisissez le point, la posture et l’instrument.</li>
                  <li>Notez la méthode et gardez-la à chaque séance.</li>
                  <li>Lisez en {selected.unit}.</li>
                </ol>
              </>
            )}
          </article>
        )}
        <details className="guide-basics guide-sources">
          <summary>Méthodes et sources</summary>
          <p>
            Repères adaptés au suivi à domicile. Le bras est mesuré relâché ; la
            cuisse à mi-hauteur. Pour la poitrine et les épaules, ce guide fixe
            la lecture en fin d’expiration normale. Plusieurs protocoles
            existent : gardez toujours le même.
          </p>
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6054651/"
            target="_blank"
            rel="noreferrer"
          >
            Woolcott et Bergman · tour spécifique au RFM
          </a>
          <a
            href="https://www.phenxtoolkit.org/protocols/view/021602"
            target="_blank"
            rel="noopener noreferrer"
          >
            PhenX · tour de taille au milieu côte–bassin
          </a>
          <a
            href="https://wwwn.cdc.gov/nchs/data/nhanes/public/2021/manuals/2021-Anthropometry-Procedures-Manual-508.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            CDC / NHANES · bras relâché et hanches (PDF)
          </a>
          <a
            href="https://wwwn.cdc.gov/nchs/data/nhanes3/manuals/anthro.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            CDC / NHANES III · milieu de cuisse (PDF)
          </a>
          <a
            href="https://tools.openlab.psu.edu/publicData/ANSURII-TR11-017.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            ANSUR II · poitrine, épaules et mollets (PDF)
          </a>
          <a
            href="https://mreed.umtri.umich.edu/mreed/documents/DOD-HDBK-743A_anthro_handbook.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            DOD · avant-bras relâché (PDF)
          </a>
          <a
            href="https://api.army.mil/e2/c/downloads/566071.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Repères du cou et de l’abdomen · annexe B (PDF)
          </a>
        </details>
      </div>
    </details>
  );
}
