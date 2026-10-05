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
  avoid: string;
}

const instructions: Record<GuideRegion, MeasurementInstructions> = {
  waist: {
    region: "waist",
    landmark:
      "À mi-distance entre la dernière côte et le haut de l’os du bassin.",
    steps: [
      "Sur le côté du corps, repérez le bord inférieur de la dernière côte palpable et le haut de l’os du bassin (crête iliaque). Marquez le milieu entre les deux.",
      "Debout, pieds rapprochés et ventre relâché, passez le ruban autour du corps à cette hauteur. Vérifiez dans un miroir qu’il reste horizontal, aussi dans le dos.",
      "Laissez les bras retomber et lisez à la fin d’une expiration normale, sans rentrer le ventre ni serrer la peau.",
    ],
    avoid:
      "Le nombril et la partie la plus étroite du ventre ne sont pas les repères de cette méthode. L’abdomen au nombril est une autre mensuration.",
  },
  hips: {
    region: "hips",
    landmark: "Autour de la partie la plus saillante des fesses.",
    steps: [
      "Debout, pieds joints et poids réparti sur les deux pieds, repérez de profil la partie la plus saillante des fesses.",
      "Entourez les hanches et les fesses à ce niveau. Contrôlez dans un miroir que le ruban reste parallèle au sol sur tout le tour.",
      "Gardez les fessiers relâchés. Lisez avec le ruban au contact de la peau, sans l’enfoncer.",
    ],
    avoid:
      "Ne prenez pas le tour au sommet des os du bassin : il doit inclure le volume des fesses.",
  },
  chest: {
    region: "chest",
    landmark: "Autour de la partie la plus volumineuse de la poitrine.",
    steps: [
      "Debout, épaules relâchées, placez le ruban sur la partie la plus volumineuse de la poitrine. Si vous portez un soutien-gorge, gardez le même modèle non rembourré à chaque séance.",
      "Passez le ruban sous les aisselles et dans le dos, dans un plan horizontal. Abaissez les bras pour lire.",
      "Pour ce suivi à domicile, lisez toujours à la fin d’une expiration normale, sans bomber le torse ni comprimer la poitrine.",
    ],
    avoid:
      "Ne mesurez pas sous la poitrine. Une grande inspiration ou un soutien-gorge différent peut modifier le résultat.",
  },
  neck: {
    region: "neck",
    landmark: "Juste sous le larynx, au-dessus de la base du cou.",
    steps: [
      "Debout, regardez droit devant vous et relâchez les épaules. Repérez le larynx, la saillie à l’avant du cou.",
      "Passez le ruban juste en dessous, perpendiculairement à l’axe du cou, sans inclure les muscles à sa base.",
      "Gardez la tête droite et le ruban simplement au contact. Lisez sans appuyer sur le cou.",
    ],
    avoid:
      "Ne passez pas sur le larynx et ne baissez pas le menton pendant la lecture.",
  },
  shoulders: {
    region: "shoulders",
    landmark: "Un tour complet passant sur les deux muscles des épaules.",
    steps: [
      "Debout, bras le long du corps, repérez le milieu du relief de chaque muscle d’épaule (deltoïde). Faites-vous aider pour poser le ruban.",
      "Faites le tour des deux épaules, de la poitrine et du dos à ce niveau. Suivez les deux repères sans relever les épaules.",
      "Pour ce suivi, lisez à la fin d’une expiration normale, bras et épaules relâchés, sans comprimer la peau.",
    ],
    avoid:
      "Il s’agit d’une circonférence, pas de la largeur d’une épaule à l’autre. Si les épaules sont asymétriques, suivez les repères plutôt que de forcer l’horizontale.",
  },
  abdomen: {
    region: "abdomen",
    landmark: "Autour du ventre, exactement à la hauteur du nombril.",
    steps: [
      "Debout, repérez le centre du nombril. Gardez le ventre relâché et les bras le long du corps.",
      "Faites passer le ruban sur ce repère et tout autour du ventre. Vérifiez qu’il est horizontal devant, sur les côtés et dans le dos.",
      "Lisez à la fin d’une expiration normale, sans rentrer le ventre ni comprimer la peau.",
    ],
    avoid:
      "Ne remontez pas le ruban vers le tour de taille : les deux repères doivent rester distincts.",
  },
  biceps: {
    region: "biceps",
    landmark: "Au milieu du haut du bras, muscle relâché.",
    steps: [
      "Pliez le coude à 90°. Repérez la pointe osseuse de l’épaule (acromion) et celle du coude (olécrâne). Mesurez leur distance à l’arrière du bras et marquez le milieu.",
      "Laissez le bras retomber, main ouverte et muscle relâché. Faites le tour du bras au repère, perpendiculairement à son axe.",
      "Lisez sans serrer. Reprenez le même côté et le même repère à chaque séance.",
    ],
    avoid:
      "Ce guide utilise le bras relâché au milieu, pas le biceps contracté à son maximum. Si vos anciennes entrées suivent une autre méthode, conservez-la ou notez le changement.",
  },
  forearm: {
    region: "forearm",
    landmark: "Autour de la partie la plus large de l’avant-bras relâché.",
    steps: [
      "Debout, laissez le bras descendre et gardez le coude déplié, la main ouverte et les muscles relâchés.",
      "Déplacez doucement le ruban sous le coude pour trouver le tour le plus large. Placez-le perpendiculairement à l’axe de l’avant-bras.",
      "Lisez sans serrer. Notez le niveau choisi et gardez le même côté et la même position de main lors des prochaines séances.",
    ],
    avoid:
      "Ne fermez pas le poing et ne mesurez pas le coude ou le poignet. La contraction change le tour.",
  },
  thigh: {
    region: "thigh",
    landmark: "À mi-distance entre le pli de l’aine et le haut de la rotule.",
    steps: [
      "Assis, genou plié à 90°, repérez à l’avant de la cuisse le pli de l’aine et le bord supérieur de la rotule. Marquez le milieu de leur distance.",
      "Relevez-vous. Avancez légèrement la jambe mesurée et prenez appui sur l’autre pour relâcher la cuisse. Vous pouvez vous tenir à un support.",
      "Entourez la cuisse au repère, perpendiculairement à son axe. Lisez sans comprimer la peau.",
    ],
    avoid:
      "Le haut de la cuisse et son milieu donnent des tours différents. Reprenez le même niveau et le même côté ; notez tout changement de méthode.",
  },
  calf: {
    region: "calf",
    landmark: "Autour de la partie la plus large du mollet.",
    steps: [
      "Debout, pieds légèrement écartés et bien à plat, répartissez votre poids sur les deux jambes.",
      "Déplacez le ruban vers le haut puis vers le bas du mollet pour repérer son tour maximal. Gardez le ruban horizontal.",
      "Lisez au niveau le plus large, sans serrer et sans vous mettre sur la pointe des pieds. Conservez le même côté.",
    ],
    avoid:
      "Ne prenez pas le tour près du genou ou de la cheville et ne contractez pas volontairement le mollet.",
  },
};

export function measurementInstructions(id: string) {
  const region = id.replace(/-(left|right)$/, "") as GuideRegion;
  return instructions[region];
}
