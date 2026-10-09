// Repères de suivi à domicile ; les méthodes et adaptations sont documentées
// dans docs/guide-mensurations.md. Aucun protocole n’est déduit d’un nom personnalisé.
export type GuideRegion =
  | "waist"
  | "hips"
  | "chest"
  | "neck"
  | "shoulders"
  | "abdomen"
  | "biceps"
  | "forearm"
  | "thigh"
  | "calf";

export interface MeasurementInstructions {
  region: GuideRegion;
  landmark: string;
  steps: [string, string, string];
}

const instructions: Record<GuideRegion, MeasurementInstructions> = {
  waist: {
    region: "waist",
    landmark:
      "À mi-distance entre la dernière côte et le haut de l’os du bassin.",
    steps: [
      "Repérez le milieu entre la dernière côte et le haut de l’os du bassin, sur le côté.",
      "Debout, pieds rapprochés et ventre relâché, posez le ruban à l’horizontale, dos compris.",
      "Lisez en fin d’expiration normale, sans rentrer le ventre ni serrer la peau.",
    ],
  },
  hips: {
    region: "hips",
    landmark: "Autour de la partie la plus saillante des fesses.",
    steps: [
      "Debout, pieds joints, repérez la partie la plus saillante des fesses.",
      "Entourez-la avec le ruban, à l’horizontale. Vérifiez dans un miroir.",
      "Lisez avec les fessiers relâchés, sans serrer la peau.",
    ],
  },
  chest: {
    region: "chest",
    landmark: "Autour de la partie la plus volumineuse de la poitrine.",
    steps: [
      "Debout, épaules relâchées, repérez la partie la plus volumineuse. Gardez le même soutien-gorge non rembourré si vous en portez un.",
      "Passez le ruban à l’horizontale, sous les aisselles et dans le dos. Baissez les bras.",
      "Lisez en fin d’expiration normale, sans bomber le torse ni serrer.",
    ],
  },
  neck: {
    region: "neck",
    landmark: "Juste sous le larynx, au-dessus de la base du cou.",
    steps: [
      "Debout, tête droite et épaules relâchées, repérez la saillie à l’avant du cou.",
      "Placez le ruban juste dessous, perpendiculaire au cou, au-dessus de sa base.",
      "Lisez sans baisser le menton ni appuyer sur le cou.",
    ],
  },
  shoulders: {
    region: "shoulders",
    landmark: "Un tour complet passant sur les deux muscles des épaules.",
    steps: [
      "Debout, bras baissés, repérez le milieu de chaque muscle d’épaule. Faites-vous aider.",
      "Faites le tour des deux épaules, de la poitrine et du dos, en suivant ces repères.",
      "Lisez en fin d’expiration normale, épaules relâchées et ruban sans serrer.",
    ],
  },
  abdomen: {
    region: "abdomen",
    landmark: "Autour du ventre, exactement à la hauteur du nombril.",
    steps: [
      "Debout, ventre relâché et bras baissés, repérez le centre du nombril.",
      "Entourez le ventre à cette hauteur. Gardez le ruban horizontal, dos compris.",
      "Lisez en fin d’expiration normale, sans rentrer le ventre ni serrer.",
    ],
  },
  biceps: {
    region: "biceps",
    landmark: "Au milieu du haut du bras, muscle relâché.",
    steps: [
      "Coude plié à 90°, marquez le milieu entre les pointes de l’épaule et du coude, à l’arrière du bras.",
      "Baissez le bras, main ouverte. Entourez le repère, ruban perpendiculaire au bras.",
      "Lisez sans contracter ni serrer. Gardez le même côté et le même repère.",
    ],
  },
  forearm: {
    region: "forearm",
    landmark: "Autour de la partie la plus large de l’avant-bras relâché.",
    steps: [
      "Debout, bras baissé et coude déplié, gardez la main ouverte et les muscles relâchés.",
      "Cherchez le tour le plus large sous le coude. Posez le ruban perpendiculaire à l’avant-bras.",
      "Lisez sans serrer. Gardez ce repère, ce côté et la même position de main.",
    ],
  },
  thigh: {
    region: "thigh",
    landmark: "À mi-distance entre le pli de l’aine et le haut de la rotule.",
    steps: [
      "Assis, genou à 90°, marquez le milieu entre le pli de l’aine et le haut de la rotule.",
      "Levez-vous. Avancez la jambe mesurée, en appui sur l’autre pour relâcher la cuisse.",
      "Entourez le repère, ruban perpendiculaire à la cuisse. Lisez sans serrer.",
    ],
  },
  calf: {
    region: "calf",
    landmark: "Autour de la partie la plus large du mollet.",
    steps: [
      "Debout, pieds à plat et légèrement écartés, répartissez votre poids sur les deux jambes.",
      "Cherchez la partie la plus large du mollet en déplaçant le ruban. Gardez-le horizontal.",
      "Lisez sans contracter ni serrer. Gardez le même côté à chaque séance.",
    ],
  },
};

export function measurementInstructions(id: string) {
  const region = id.replace(/-(left|right)$/, "") as GuideRegion;
  return instructions[region];
}
