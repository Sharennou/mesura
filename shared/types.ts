export type ConsentPurpose = "body" | "photos" | "push" | "email";
export interface Measure {
  id: string;
  name: string;
  unit: string;
  custom?: boolean;
  archived?: boolean;
}
// Legacy photo metadata is retained only for existing data and its cleanup.
export interface Photo {
  id: string;
  entryId: string;
  orientation: "face" | "profil" | "dos";
}
export interface Entry {
  id: string;
  date: string;
  createdAt: string;
  height: number | null;
  values: Record<string, number>;
  note: string;
  photos: Photo[];
}
export interface Goal {
  measureId: string;
  start: number;
  target: number;
  startDate: string;
}
export interface Reminder {
  enabled: boolean;
  weekday: number;
  weekdays?: number[];
  frequency: "week" | "fortnight" | "month";
  time: string;
  timezone: string;
  anchor: string;
  channel: "push" | "email";
  nextAt?: string | null;
}
export interface Profile {
  avatar?: string | null;
  onboardingCompleted?: boolean;
  name: string;
  height: number | null;
  timezone: string;
  visible: string[];
}
export interface AccountData {
  profile: Profile;
  entries: Entry[];
  measures: Measure[];
  goal: Goal | null;
  consents: Record<ConsentPurpose, boolean>;
  reminder: Reminder | null;
  devices: number;
}
export interface Capabilities {
  pushConfigured: boolean;
  emailConfigured: boolean;
  development: boolean;
  privacyContact: string | null;
}
