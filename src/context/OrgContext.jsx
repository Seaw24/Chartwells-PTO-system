import React from "react";
import { useCatalog } from "./CatalogContext.jsx";
import { useDataSource } from "../data/dataSource.jsx";
export const OrgContext = React.createContext(null);
export function SupabaseOrgProvider({ children: children }) {
  const t = useCatalog(),
    n = useDataSource(),
    r = React.useCallback(() => t.reload(), [t]),
    s = React.useCallback(
      async ({ name: name, description: description, members = [] }) => {
        const N = await n.saveTeam({
          name: name,
          description: description,
          members: members,
        });
        return (r(), N.id);
      },
      [n, r],
    ),
    i = React.useCallback(
      async (m) => {
        (await n.deleteTeam(m), r());
      },
      [n, r],
    ),
    o = React.useCallback(
      async (m, x) => {
        const b = t.teams.find((N) => N.id === m);
        (await n.saveTeam({
          id: m,
          name: x,
          description: (b == null ? void 0 : b.description) ?? "",
        }),
          r());
      },
      [n, r, t.teams],
    ),
    c = React.useCallback(
      async (m, x) => {
        const b = t.teams.find((N) => N.id === m);
        (await n.saveTeam({
          id: m,
          name: (b == null ? void 0 : b.name) ?? "",
          description: x,
        }),
          r());
      },
      [n, r, t.teams],
    ),
    l = React.useCallback(
      async (m, x) => {
        (await n.addMemberships(m, x), r());
      },
      [n, r],
    ),
    u = React.useCallback(
      async (m, x, b, N, _ = "employee") => {
        (await n.addMemberships(
          m,
          x.map((j) => ({
            userId: j,
            role: _,
          })),
        ),
          r());
      },
      [n, r],
    ),
    h = React.useCallback(
      async (m, x) => {
        (await n.removeMembership(m, x), r());
      },
      [n, r],
    ),
    d = React.useCallback(
      async (m, x, b) => {
        (await n.setMembershipRole(m, x, b), r());
      },
      [n, r],
    ),
    f = React.useCallback(
      async (m) => {
        const x = await n.provisionEmployee(m);
        return (r(), x);
      },
      [n, r],
    ),
    p = React.useCallback((m) => n.resetTemporaryPassword(m), [n]),
    y = React.useCallback(
      async (m, x) => {
        (await n.setProfileOrgRole(m, x), r());
      },
      [n, r],
    ),
    g = React.useCallback(
      async (m, x) => {
        (await n.setProfileActive(m, x), r());
      },
      [n, r],
    ),
    k = React.useCallback(
      async (m) => {
        (await n.setProfileActive(m, !1), r());
      },
      [n, r],
    ),
    v = React.useMemo(() => {
      // Deactivated people sort after active ones wherever people or team members are listed.
      const inactiveLast = (T, C) =>
          Number(T.isActive === !1) - Number(C.isActive === !1),
        m = t.teams,
        x = t.users
          .map((T) => ({
            id: T.id,
            name: T.name,
            email: T.email,
            orgRole: T.orgRole,
            isActive: T.isActive,
            normalDaysOff: T.normalDaysOff,
            updatedAt: T.updatedAt,
            updatedBy: T.updatedBy,
          }))
          .sort(inactiveLast),
        b = t.users.flatMap((T) =>
          (T.memberships ?? []).map((C) => ({
            ...C,
            userId: T.id,
          })),
        ),
        N = (T) => m.find((C) => C.id === T),
        _ = (T) => x.find((C) => C.id === T);
      return {
        teams: m,
        people: x,
        memberships: b,
        teamById: N,
        personById: _,
        membersOf: (T) =>
          b
            .filter((C) => C.teamId === T)
            .map((C) => ({
              ..._(C.userId),
              role: C.role,
              addedBy: C.addedBy,
              addedAt: C.addedAt,
              membership: C,
            }))
            .filter((C) => C.id)
            .sort(inactiveLast),
        teamsOf: (T) =>
          b
            .filter((C) => C.userId === T)
            .map((C) => ({
              team: N(C.teamId),
              role: C.role,
              membership: C,
            }))
            .filter((C) => C.team),
        adminTeamIds: (T) =>
          b
            .filter((C) => C.userId === T && C.role === "admin")
            .map((C) => C.teamId),
        isTeamAdmin: (T, C) =>
          b.some((H) => H.userId === T && H.teamId === C && H.role === "admin"),
        createTeam: s,
        deleteTeam: i,
        renameTeam: o,
        describeTeam: c,
        addMembers: u,
        addMembersWithRoles: l,
        removeMembership: h,
        setMembershipRole: d,
        addPerson: f,
        resetTemporaryPassword: p,
        setOrgRole: y,
        setProfileActive: g,
        removePerson: k,
      };
    }, [t.teams, t.users, s, i, o, c, u, l, h, d, f, p, y, g, k]);
  return <OrgContext.Provider value={v}>{children}</OrgContext.Provider>;
}
export const OrgProvider = SupabaseOrgProvider;
export function useOrg() {
  const e = React.useContext(OrgContext);
  if (!e) throw new Error("useOrg must be used within an OrgProvider");
  return e;
}
