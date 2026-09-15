import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDataSource } from "../data/dataSource.jsx";
import { useCurrentUser } from "./AuthContext.jsx";
import { friendlyError } from "../utils/errors.jsx";
export const CatalogContext = createContext(null);
export const EMPTY_CATALOG = {
  users: [],
  teams: [],
  ptoTypes: [],
  settingsPtoTypes: [],
  holidays: [],
  blackouts: [],
  dateRules: [],
};
export function CatalogProvider({ children }) {
  const source = useDataSource();
  const user = useCurrentUser();
  const query = useQuery({
    queryKey: ["catalog", user.id],
    queryFn: async () => {
      const [
        users,
        teams,
        ptoTypes,
        settingsPtoTypes,
        holidays,
        blackouts,
        dateRules,
      ] = await Promise.all([
        source.getUsers(),
        source.getTeams(),
        source.getPtoTypes(),
        source.getSettingsPtoTypes(),
        source.getHolidays(),
        source.getBlackouts(),
        source.getDateRules(),
      ]);
      return {
        users,
        teams,
        ptoTypes,
        settingsPtoTypes,
        holidays,
        blackouts,
        dateRules,
      };
    },
  });
  const value = useMemo(() => {
    const data = query.data ?? EMPTY_CATALOG;
    return {
      ...data,
      loading: query.isPending,
      error: query.error,
      version: query.dataUpdatedAt,
      userById: (id) => data.users.find((u) => u.id === id),
      teamById: (id) => data.teams.find((t) => t.id === id),
      ptoTypeById: (id) => data.ptoTypes.find((t) => t.id === id),
      // Holiday Day Off is one day per holiday, not a yearly balance, so balance views skip it.
      balanceTypes: data.ptoTypes.filter((t) => !t.isHolidayDayOff),
      holidayDayOffType: data.ptoTypes.find((t) => t.isHolidayDayOff) ?? null,
      reload: () => {},
    };
  }, [query.data, query.isPending, query.error, query.dataUpdatedAt]);
  if (!query.data && query.isPending)
    return (
      <div
        className="grid min-h-screen place-items-center bg-surface text-sm text-ink-mute"
        role="status"
      >
        Opening your workspace…
      </div>
    );
  if (!query.data && query.error)
    return (
      <main className="grid min-h-screen place-items-center bg-surface p-6">
        <section
          role="alert"
          className="rounded-card border border-line bg-card p-6"
        >
          <h1 className="text-lg font-bold text-ink">Couldn't load the app</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {friendlyError(query.error)}
          </p>
          <button
            className="mt-4 rounded-btn bg-accent-strong px-4 py-2 text-white"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog must be within CatalogProvider");
  return catalog;
}
