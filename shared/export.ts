import type { AccountData } from "./types.ts";
import { TOOL_VERSION } from "./body-tools.ts";
/** Append-only CSV columns preserve the seven original columns for old consumers. */
export function accountCsv(a: AccountData) {
  const rows: unknown[][] = [
    [
      "date",
      "fuseau",
      "mesure",
      "valeur",
      "unité",
      "stature_cm",
      "note",
      "entree_id",
      "protocole_tour_taille",
      "protocole_rfm",
      "hauteur_date",
      "hauteur_origine",
      "naissance",
      "equation",
      "situation",
      "version_contexte",
      "version_calcul",
    ],
  ];
  for (const e of a.entries) {
    const values = Object.entries(e.values);
    for (const [id, value] of values.length ? values : [["", ""]]) {
      const measure = a.measures.find((m) => m.id === id);
      rows.push([
        e.date,
        a.profile.timezone,
        measure?.name ?? id,
        value,
        measure?.unit ?? "",
        e.height,
        e.note,
        e.id,
        e.tools?.waistProtocol ?? "unknown",
        e.tools?.rfmWaistProtocol ?? "unknown",
        e.tools?.heightDate ?? "",
        e.tools?.heightOrigin ?? "legacy",
        e.tools?.birthDate ?? "",
        e.tools?.equation ?? "unspecified",
        e.tools?.situation ?? "unknown",
        e.tools?.version ?? "",
        TOOL_VERSION,
      ]);
    }
  }
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value ?? "");
            if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
export const EXPORT_SCHEMA_VERSION = 2;
