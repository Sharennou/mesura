import { useApp } from "./context";
import type { SetStateAction } from "react";

// Session-only UI context: no measurements or photos are written to browser storage.
export function useViewState<T>(
  key: string,
  initial: T,
): [T, (value: SetStateAction<T>) => void] {
  const { viewState, setViewState } = useApp();
  const value = (viewState[key] as T | undefined) ?? initial;
  return [
    value,
    (next) =>
      setViewState((state) => {
        const current = (state[key] as T | undefined) ?? initial;
        return {
          ...state,
          [key]:
            typeof next === "function"
              ? (next as (previous: T) => T)(current)
              : next,
        };
      }),
  ];
}
