export const SOURCE_ACCESSED = "2026-10-06";
export const TOOL_SOURCES = {
  nice: {
    title:
      "NG246 — Identifying and assessing overweight, obesity and central adiposity",
    authors: "NICE",
    year: "2025, mise à jour 8 janvier 2026",
    doi: null,
    role: "Interprétation et protocole · recommandations adultes 1.9.5, 1.9.8, 1.9.14–1.9.15",
    url: "https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity",
  },
  has: {
    title: "Guide du parcours de soins : surpoids et obésité de l’adulte",
    authors: "Haute Autorité de Santé",
    year: "2024, mise à jour 27 novembre 2024",
    doi: null,
    role: "Interprétation · évaluation multidimensionnelle",
    url: "https://www.has-sante.fr/jcms/p_3408871/fr/guide-du-parcours-de-soinssurpoids-et-obesite-de-l-adulte",
  },
  who: {
    title:
      "Waist circumference and waist-hip ratio: report of a WHO expert consultation",
    authors: "Organisation mondiale de la Santé",
    year: "2011 (consultation 2008)",
    doi: null,
    role: "Protocole et interprétation · variations selon les populations",
    url: "https://www.who.int/publications/i/item/9789241501491",
  },
  rfm: {
    title:
      "Relative fat mass (RFM) as a new estimator of whole-body fat percentage — A cross-sectional study in American adult individuals",
    authors: "Woolcott OO, Bergman RN",
    year: "2018",
    doi: "10.1038/s41598-018-29362-1",
    role: "Formule, protocole et validation principale",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6054651/",
  },
  mexico: {
    title:
      "External validation of the relative fat mass (RFM) index in adults from north-west Mexico using different reference methods",
    authors:
      "Guzmán-León AE, Velarde AG, Vidal-Salas M, Urquijo-Ruiz LG, Caraveo-Gutiérrez LA, Valencia ME",
    year: "2019",
    doi: "10.1371/journal.pone.0226767",
    role: "Validation externe",
    url: "https://pubmed.ncbi.nlm.nih.gov/31891616/",
  },
  mifflin: {
    title:
      "A new predictive equation for resting energy expenditure in healthy individuals",
    authors: "Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO",
    year: "1990",
    doi: "10.1093/ajcn/51.2.241",
    role: "Formule simplifiée et population de développement",
    url: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
  },
  frankenfield: {
    title:
      "Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review",
    authors: "Frankenfield D, Roth-Yousey L, Compher C",
    year: "2005",
    doi: "10.1016/j.jada.2005.02.005",
    role: "Validation · revue systématique et erreurs individuelles",
    url: "https://pubmed.ncbi.nlm.nih.gov/15883556/",
  },
} as const;
export type ToolSourceId = keyof typeof TOOL_SOURCES;
