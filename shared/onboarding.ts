import { onboardingToolProfileSchema, toolDateSchema } from "./tool-schemas.ts";
import { z } from "zod";
import { CONSENT_VERSION } from "./config.ts";

// Une seule validation pour la transaction locale et le compte cloud.
export const onboardingSchema = z.object({
  height: z.number().finite().positive().max(300),
  heightDate: toolDateSchema,
  toolProfile: onboardingToolProfileSchema,
  consent: z.literal(true),
  version: z.literal(CONSENT_VERSION),
  goal: z
    .object({
      measureId: z.string().min(1),
      start: z.number().finite().positive().max(100000),
      target: z.number().finite().positive().max(100000),
    })
    .nullable(),
});
