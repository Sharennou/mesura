import type { AccountData } from "../shared/types";
import { STANDARD_MEASURES, DEFAULT_VISIBLE } from "../shared/catalog";

export function emptyAccountData(): AccountData {
  return {
    profile: {
      onboardingCompleted: false,
      name: "Mon espace",
      height: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      visible: [...DEFAULT_VISIBLE],
    },
    entries: [],
    measures: structuredClone(STANDARD_MEASURES),
    goal: null,
    consents: { body: false, photos: false, push: false, email: false },
    reminder: null,
    devices: 0,
  };
}
