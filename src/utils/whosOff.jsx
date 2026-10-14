import { useMemo } from "react";
import { CatalogContext, useCatalog } from "../context/CatalogContext.jsx";
// Everyone sees who is off on every team, the way HR does. The viewer's own reads stay first, so a
// request they can open keeps its full, clickable copy; who_is_off() and team_directory() fill in
// everyone else as view-only bars and name-only people.
export function mergeWhosOff({
  requests = [],
  users = [],
  offRequests = [],
  directory = [],
}) {
  const requestIds = new Set(requests.map((r) => r.id)),
    userIds = new Set(users.map((u) => u.id)),
    extraPeople = directory.filter((p) => !userIds.has(p.id));
  return {
    requests: [
      ...requests,
      ...offRequests.filter((r) => !requestIds.has(r.id)),
    ],
    users: extraPeople.length
      ? [...users, ...extraPeople].sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? ""),
        )
      : users,
  };
}
// The calendar and dashboard draw names through useCatalog(); this gives their subtree the merged
// people without changing the catalog the rest of the app reads.
export function WhosOffCatalog({ users, children }) {
  const catalog = useCatalog();
  const value = useMemo(
    () => ({
      ...catalog,
      users,
      userById: (id) => users.find((u) => u.id === id),
    }),
    [catalog, users],
  );
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
