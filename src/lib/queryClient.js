import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
const listeners = new Set();
let revision = 0;
export const subscribeChanges = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getRevision = () => revision;
const configWrites = new Set([
  "savePtoType",
  "retirePtoType",
  "saveHoliday",
  "deleteHoliday",
  "saveBlackout",
  "deleteBlackout",
  "saveTeam",
  "deleteTeam",
  "addMemberships",
  "removeMembership",
  "setMembershipRole",
  "setProfileOrgRole",
  "setProfileActive",
  "provisionEmployee",
  "setNormalDaysOff",
]);
const reads = new Set([
  "getRequests",
  "requestsForUser",
  "pendingForApprover",
  "recentDecisionsBy",
  "decisionHistory",
  "outOnDay",
  "grantFor",
  "usedFor",
  "balanceFor",
  "normalDaysOffFor",
  "getGrants",
  "getUsers",
  "getTeams",
  "getPtoTypes",
  "getSettingsPtoTypes",
  "getHolidays",
  "getBlackouts",
  "getDateRules",
  "coverageForRange",
  "teamMembers",
  "getNotifications",
  "unreadCount",
]);
export async function refreshAfterWrite(method) {
  // Cancel pending reads before invalidation so an older response cannot win a race.
  await queryClient.cancelQueries({ queryKey: ["data"] });
  await queryClient.invalidateQueries({
    queryKey: ["data"],
    refetchType: "none",
  });
  const jobs = [queryClient.invalidateQueries({ queryKey: ["view"] })];
  if (configWrites.has(method))
    jobs.push(queryClient.invalidateQueries({ queryKey: ["catalog"] }));
  revision += 1;
  listeners.forEach((listener) => listener());
  await Promise.all(jobs);
}
export function withQueryCache(source) {
  return Object.fromEntries(
    Object.entries(source).map(([method, fn]) => [
      method,
      reads.has(method)
        ? (...args) =>
            queryClient.fetchQuery({
              queryKey: ["data", method, ...args],
              queryFn: () => fn(...args),
            })
        : async (...args) => {
            const result = await fn(...args);
            await refreshAfterWrite(method);
            return result;
          },
    ]),
  );
}
export function clearSessionCache() {
  queryClient.clear();
  revision += 1;
  listeners.forEach((listener) => listener());
}
