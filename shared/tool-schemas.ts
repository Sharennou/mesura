import { z } from "zod";
import { validDate, TOOL_VERSION, LEGACY_TOOL_VERSION } from "./body-tools.ts";
export const toolDateSchema = z.string().refine(validDate, "Date invalide.");
const waistProtocolSchema = z.enum(["unknown", "nice-midpoint", "iliac-crest"]);
const rfmWaistProtocolSchema = z.enum(["unknown", "iliac-crest"]);
export const toolProfileSchema = z.object({
  birthDate: toolDateSchema.nullable(),
  equation: z.enum(["unspecified", "male", "female"]),
  waistProtocol: waistProtocolSchema.optional(),
  rfmWaistProtocol: rfmWaistProtocolSchema.optional(),
});
export const onboardingToolProfileSchema = toolProfileSchema.extend({
  birthDate: toolDateSchema,
});
export const toolContextSchema = toolProfileSchema.extend({
  version: z.enum([TOOL_VERSION, LEGACY_TOOL_VERSION]),
  waistProtocol: waistProtocolSchema,
  rfmWaistProtocol: rfmWaistProtocolSchema,
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
