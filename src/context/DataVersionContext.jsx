import { useSyncExternalStore } from "react";
import { subscribeChanges, getRevision } from "../lib/queryClient.js";
// Compatibility for recovered detail views. Successful mutations own invalidation.
// UI callbacks no longer trigger a second fetch or increment a provider-wide state.
const alreadyRefreshed = () => {};
export function DataVersionProvider({ children }) {
  return children;
}
export function useVersion() {
  return useSyncExternalStore(subscribeChanges, getRevision);
}
export function useBumpVersion() {
  return alreadyRefreshed;
}
export function useDataVersion() {
  return { version: useVersion(), bump: alreadyRefreshed };
}
