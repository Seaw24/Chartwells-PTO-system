import { createSupabaseDataSource } from "./supabaseDataSource.jsx";
import { withQueryCache } from "../lib/queryClient.js";
export const DEMO_MODE = false;
let dataSource;
export function getDataSource() {
  return (dataSource ??= withQueryCache(createSupabaseDataSource()));
}
export const useDataSource = getDataSource;
