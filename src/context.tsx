import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AccountData, Capabilities, Entry } from "../shared/types";
export type Screen =
  | "onboarding"
  | "measure"
  | "analysis"
  | "reminder"
  | "success"
  | "account"
  | "privacy"
  | "history"
  | "entry"
  | "edit"
  | "profile"
  | "photos"
  | "compare"
  | "monthly"
  | "goal"
  | "favorites"
  | "legal";
export interface MeasurementDraft {
  values: Record<string, string>;
  date: string;
  note: string;
  photos: Record<string, File>;
  requestId: string;
}
export interface EditingDraft extends MeasurementDraft {
  height: string;
}
export interface AppContextValue {
  data: AccountData;
  setData: Dispatch<SetStateAction<AccountData>>;
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
  viewEntry: (id: string) => void;
  entryId: string | null;
  viewState: Record<string, unknown>;
  setViewState: Dispatch<SetStateAction<Record<string, unknown>>>;
  capabilities: Capabilities;
  reload: () => Promise<void>;
  requireAccount: () => boolean;
  toast: (text: string) => void;
  editing: Entry | null;
  edit: (entry: Entry | null) => void;
  success: { entry: Entry; previous: number | null } | null;
  saved: (entry: Entry, previous: number | null) => void;
  draft: MeasurementDraft | null;
  setDraft: Dispatch<SetStateAction<MeasurementDraft | null>>;
  editingDrafts: Record<string, EditingDraft>;
  setEditingDrafts: Dispatch<SetStateAction<Record<string, EditingDraft>>>;
  historyMonth: string | null;
  setHistoryMonth: Dispatch<SetStateAction<string | null>>;
}
export const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);
