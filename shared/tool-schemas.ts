import { z } from "zod";
import { validDate, TOOL_VERSION } from "./body-tools.ts";
export const toolDateSchema = z.string().refine(validDate, "Date invalide.");
export const toolProfileSchema = z.object({
  birthDate: toolDateSchema.nullable(),
  equation: z.enum(["unspecified", "male", "female"]),
});
export const toolContextSchema = toolProfileSchema.extend({
  version: z.literal(TOOL_VERSION),
  situation: z.enum([
    "unknown",
    "none",
    "pregnancy",
    "breastfeeding",
    "altered",
  ]),
  waistProtocol: z.enum(["unknown", "nice-midpoint", "iliac-crest"]),
  rfmWaistProtocol: z.enum(["unknown", "iliac-crest"]),
  heightDate: toolDateSchema.nullable(),
  heightOrigin: z.enum(["session", "profile", "legacy"]),
});
export function toolDateIssue(
  tools: z.infer<typeof toolContextSchema> | undefined,
  date: string,
) {
  if (tools?.birthDate && tools.birthDate > date)
    return "La date de naissance est postérieure à la séance. Vérifiez-la.";
  if (tools?.heightDate && tools.heightDate > date)
    return "La hauteur a été mesurée après cette séance. Vérifiez sa valeur et sa date.";
  return null;
}
